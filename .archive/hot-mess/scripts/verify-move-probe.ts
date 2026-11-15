/**
 * Self-contained browser probe for the canvas and the static exports.
 * Starts its own dev server (port 5199), drives a headless browser, asserts,
 * and cleans up. Expectations are COMPUTED from ux-flow-map.json, not
 * hardcoded, so the probe stays valid as the fixture app grows.
 *
 * Prerequisites: `pnpm ux:all` has run (ux-out/ is populated) and Playwright's
 * chromium is installed. Run via `pnpm ux:probe`.
 */
import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import type { FlowMap } from "./lib/flow-map-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = 5199;
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
function assert(ok: boolean, label: string, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

function startDevServer(): Promise<ChildProcess> {
  return new Promise((resolve, reject) => {
    const vite = spawn(
      path.join(ROOT, "node_modules", ".bin", "vite"),
      ["--port", String(PORT), "--strictPort", "--host", "127.0.0.1"],
      { cwd: ROOT },
    );
    const timeout = setTimeout(() => reject(new Error("vite dev server did not start within 60s")), 60000);
    vite.stdout.on("data", (chunk: Buffer) => {
      if (chunk.toString().includes("Local:")) {
        clearTimeout(timeout);
        resolve(vite);
      }
    });
    vite.on("exit", (code) => reject(new Error(`vite exited early (code ${code}) — is port ${PORT} free?`)));
  });
}

async function main() {
  const flowMapPath = path.join(ROOT, "ux-out", "ux-flow-map.json");
  if (!fs.existsSync(flowMapPath)) {
    throw new Error("ux-out/ux-flow-map.json missing — run `pnpm ux:all` before `pnpm ux:probe`.");
  }
  const flowMap = JSON.parse(fs.readFileSync(flowMapPath, "utf-8")) as FlowMap;

  // Expected canvas contents, derived from the flow map.
  const expectedPageNodes = flowMap.routes.length;
  const expectedLanes = new Set(flowMap.routes.map((r) => r.feature)).size + 1; // + Chrome lane
  const expectedChromeNodes = flowMap.chrome.length;
  const expectedVisibleEdges =
    flowMap.routes.reduce((n, r) => n + r.transitions.filter((t) => t.to !== r.id).length, 0) +
    flowMap.chrome.reduce((n, c) => n + c.transitions.length, 0); // stage edges hidden by default
  const expectedScreenshots = flowMap.routes.reduce((n, r) => n + r.stories.length, 0);

  const vite = await startDevServer();
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1720, height: 1050 } });
    const consoleErrors: string[] = [];
    page.on("console", (m) => {
      if (m.type() === "error") consoleErrors.push(m.text().slice(0, 250));
    });
    page.on("pageerror", (e) => consoleErrors.push(`pageerror: ${String(e).slice(0, 250)}`));

    // ---- Canvas structure ----
    await page.goto(`${BASE}/canvas`, { waitUntil: "domcontentloaded" });
    await page.waitForSelector(".react-flow__node-page", { timeout: 20000 });
    await page.waitForTimeout(2500); // let layout + lazy images settle

    const pageNodes = await page.locator(".react-flow__node-page").count();
    const lanes = await page.locator(".react-flow__node-swimlane").count();
    const chromeNodes = await page.locator(".react-flow__node-chrome").count();
    const visibleEdges = await page.locator(".react-flow__edge:visible").count();
    const pills = await page.locator("[data-edge-source]:visible").count();
    const screenshots = await page.locator(".react-flow__node-page img").count();

    assert(pageNodes === expectedPageNodes, `canvas page nodes = ${expectedPageNodes}`, `got ${pageNodes}`);
    assert(lanes === expectedLanes, `canvas swimlanes = ${expectedLanes}`, `got ${lanes}`);
    assert(chromeNodes === expectedChromeNodes, `canvas chrome nodes = ${expectedChromeNodes}`, `got ${chromeNodes}`);
    assert(visibleEdges === expectedVisibleEdges, `visible edges = ${expectedVisibleEdges}`, `got ${visibleEdges}`);
    assert(pills === expectedVisibleEdges, `edge trigger pills = ${expectedVisibleEdges}`, `got ${pills}`);
    assert(screenshots === expectedScreenshots, `screenshots on canvas = ${expectedScreenshots}`, `got ${screenshots}`);

    // ---- Tooltip on edge hover ----
    await page.locator("[data-edge-source]:visible").first().hover({ force: true });
    await page.waitForTimeout(400);
    const tooltipVisible = await page.getByText("Requires", { exact: false }).count();
    assert(tooltipVisible > 0, "edge tooltip appears on hover");

    // ---- Search focuses a route ----
    const routeToFind = flowMap.routes[flowMap.routes.length - 1].id;
    await page.fill("input[placeholder*='Search']", routeToFind);
    await page.waitForTimeout(300);
    const hit = page.locator(`button:has-text('${routeToFind}')`).first();
    assert((await hit.count()) > 0, "search returns a hit");
    await hit.click();
    await page.waitForTimeout(700);

    // ---- Click-through opens the static render ----
    const [popup] = await Promise.all([
      page.waitForEvent("popup", { timeout: 5000 }),
      page.locator(".react-flow__node-page img").first().click(),
    ]);
    assert(popup.url().includes("/static/pages--"), "screenshot click-through opens /static/…", popup.url());
    await popup.close();

    // ---- file:// export: styled, fonts embedded, portals captured ----
    const portalStory = flowMap.routes
      .flatMap((r) => r.stories)
      .find((s) => s.storyId.includes("approve-dialog-open"));
    const anyStory = portalStory ?? flowMap.routes.flatMap((r) => r.stories)[0];
    await page.goto(`file://${path.join(ROOT, "ux-out", "static", `${anyStory.storyId}.html`)}`);
    await page.waitForTimeout(800);
    const bodyText = await page.locator("body").innerText();
    assert(bodyText.trim().length > 40, "file:// export renders text content");
    if (portalStory) {
      assert(bodyText.includes("Pending draft awaits approval"), "portal dialog captured in file:// export");
    }
    const fontLoaded = await page.evaluate(() => document.fonts.check("14px 'Geist Variable'"));
    assert(fontLoaded, "Geist font embedded and loads under file://");
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    assert(bg === "rgb(9, 9, 11)", "dark theme background preserved", bg);

    // ---- Console hygiene ----
    assert(consoleErrors.length === 0, "zero console errors across the probe", consoleErrors.join(" | ").slice(0, 300));
  } finally {
    await browser.close();
    vite.kill("SIGKILL");
  }

  if (failures > 0) {
    console.error(`\nverify-move-probe FAILED (${failures} assertion(s)).`);
    process.exit(1);
  }
  console.log("\nverify-move-probe OK — canvas and static exports verified in a real browser.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
