import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";
import {
  buildDirResolver,
  buildStandaloneHtml,
  inlineCssUrls,
  inlineHtmlAssets,
} from "./lib/inline-assets";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const BUILD_DIR = path.join(ROOT, "build");
const OUT_STATIC = path.join(ROOT, "ux-out", "static");
const OUT_SHOTS = path.join(ROOT, "ux-out", "screenshots");
// NOT 61000 — that's the Ladle dev server; colliding with it breaks both.
const PORT = 61999;
const VIEWPORT = { width: 1440, height: 900 };
const DEVICE_SCALE_FACTOR = 2;

type StoryResult = {
  ok: boolean;
  error?: string;
  consoleErrors: string[];
  warnings: string[];
};

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".mjs": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".map": "application/json",
};

function startStaticServer(port: number, dir: string): Promise<http.Server> {
  const server = http.createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? "/").split("?")[0]);
    let filePath = path.join(dir, urlPath === "/" ? "index.html" : urlPath);
    if (!filePath.startsWith(dir) || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      filePath = path.join(dir, "index.html"); // SPA fallback
    }
    res.writeHead(200, { "Content-Type": MIME[path.extname(filePath)] ?? "application/octet-stream" });
    fs.createReadStream(filePath).pipe(res);
  });
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, "127.0.0.1", () => resolve(server));
  });
}

/** PNG pixel dimensions from the header (bytes 16–24). */
function pngDimensions(buf: Buffer): { width: number; height: number } {
  return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
}

async function main() {
  const filter = (() => {
    const i = process.argv.indexOf("--filter");
    return i >= 0 ? process.argv[i + 1] : undefined;
  })();

  const metaPath = path.join(BUILD_DIR, "meta.json");
  if (!fs.existsSync(metaPath)) {
    throw new Error(`No Ladle build at ${metaPath} — run "pnpm ladle:build" first.`);
  }
  const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { stories: Record<string, unknown> };
  const storyIds = Object.keys(meta.stories).filter((id) => !filter || id.includes(filter));
  if (storyIds.length === 0) {
    throw new Error(filter ? `No stories match --filter "${filter}".` : "The Ladle build contains no stories.");
  }

  fs.mkdirSync(OUT_STATIC, { recursive: true });
  fs.mkdirSync(OUT_SHOTS, { recursive: true });

  // Pre-inline every built stylesheet once, keyed by basename.
  const resolveRef = buildDirResolver(BUILD_DIR);
  const globalWarnings: string[] = [];
  const cssByBasename = new Map<string, string>();
  const assetsDir = path.join(BUILD_DIR, "assets");
  if (fs.existsSync(assetsDir)) {
    for (const file of fs.readdirSync(assetsDir).filter((f) => f.endsWith(".css"))) {
      const raw = fs.readFileSync(path.join(assetsDir, file), "utf-8");
      cssByBasename.set(file, inlineCssUrls(raw, resolveRef, globalWarnings));
    }
  }

  console.log(`Exporting ${storyIds.length} stories on port ${PORT}…`);
  const server = await startStaticServer(PORT, BUILD_DIR);
  const browser = await chromium.launch();
  const results: Record<string, StoryResult> = {};
  const manifest: Record<string, { width: number; height: number; deviceScaleFactor: number }> = {};

  try {
    const context = await browser.newContext({
      viewport: VIEWPORT,
      deviceScaleFactor: DEVICE_SCALE_FACTOR,
    });

    for (const id of storyIds) {
      const warnings: string[] = [];
      const consoleErrors: string[] = [];
      const page = await context.newPage();
      page.on("console", (msg) => {
        if (msg.type() === "error") consoleErrors.push(msg.text());
      });
      page.on("pageerror", (err) => consoleErrors.push(`pageerror: ${err.message}`));

      try {
        await page.goto(`http://127.0.0.1:${PORT}/?story=${id}&mode=preview`);
        // Content-based readiness: #ladle-root exists before the story mounts,
        // so wait for it to have content, then settle async fixtures/skeletons.
        await page.waitForFunction(
          () => {
            const root = document.querySelector("#ladle-root");
            return !!root && root.innerHTML.trim().length > 0;
          },
          undefined,
          { timeout: 15000 },
        );
        await page.waitForTimeout(750);

        const captured = await page.evaluate(() => {
          const attrs = (el: Element) =>
            Array.from(el.attributes)
              .map((a) => `${a.name}="${a.value.replace(/"/g, "&quot;")}"`)
              .join(" ");
          return {
            htmlAttrs: attrs(document.documentElement),
            bodyAttrs: attrs(document.body),
            // Whole body, not #ladle-root: portals render as body children.
            bodyInnerHtml: document.body.innerHTML,
            stylesheetHrefs: Array.from(
              document.querySelectorAll<HTMLLinkElement>("link[rel=stylesheet]"),
            ).map((l) => l.getAttribute("href") ?? ""),
            inlineStyles: Array.from(document.querySelectorAll("style")).map((s) => s.textContent ?? ""),
          };
        });

        const inlineStyles: string[] = [];
        for (const href of captured.stylesheetHrefs) {
          const base = path.basename(href.split(/[?#]/)[0]);
          const cached = cssByBasename.get(base);
          if (cached) inlineStyles.push(cached);
          else warnings.push(`stylesheet not found in build assets: ${href}`);
        }
        for (const css of captured.inlineStyles) {
          if (css.trim()) inlineStyles.push(inlineCssUrls(css, resolveRef, warnings));
        }

        const html = buildStandaloneHtml({
          title: id,
          htmlAttrs: captured.htmlAttrs,
          bodyAttrs: captured.bodyAttrs,
          bodyInnerHtml: inlineHtmlAssets(captured.bodyInnerHtml, resolveRef, warnings),
          inlineStyles,
        });
        fs.writeFileSync(path.join(OUT_STATIC, `${id}.html`), html);

        const shot = await page.screenshot({ fullPage: true });
        fs.writeFileSync(path.join(OUT_SHOTS, `${id}.png`), shot);
        manifest[id] = { ...pngDimensions(shot), deviceScaleFactor: DEVICE_SCALE_FACTOR };

        results[id] = { ok: true, consoleErrors, warnings };
        console.log(`  ✓ ${id}${consoleErrors.length ? `  (${consoleErrors.length} console error(s))` : ""}`);
      } catch (err) {
        results[id] = { ok: false, error: String(err), consoleErrors, warnings };
        console.error(`  ✗ ${id}: ${String(err)}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  fs.writeFileSync(path.join(OUT_SHOTS, "manifest.json"), JSON.stringify(manifest, null, 2));

  const failed = Object.entries(results).filter(([, r]) => !r.ok).map(([id]) => id);
  const report = {
    generatedAt: new Date().toISOString(),
    filter: filter ?? null,
    total: storyIds.length,
    succeeded: storyIds.length - failed.length,
    failed,
    globalWarnings,
    stories: results,
  };
  fs.writeFileSync(path.join(ROOT, "ux-out", "export-report.json"), JSON.stringify(report, null, 2));

  console.log(`\nExport finished: ${report.succeeded}/${report.total} stories.`);
  if (globalWarnings.length) console.warn(`Warnings: ${globalWarnings.join("; ")}`);
  if (failed.length) {
    console.error(`FAILED stories: ${failed.join(", ")}`);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("Export pipeline failed:", err);
  process.exit(1);
});
