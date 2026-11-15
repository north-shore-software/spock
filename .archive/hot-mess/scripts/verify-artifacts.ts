import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ROUTE_IDS } from "../src/routes/route-ids";
import type { FlowMap } from "./lib/flow-map-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const UX_OUT = path.join(ROOT, "ux-out");

/** Every route must have stories once the page-story phase is done. */
const STRICT_PAGES = true;

/**
 * Console errors that don't fail verification. Substring match. Every entry
 * needs a comment justifying it — an empty list is the healthy state.
 */
const CONSOLE_ERROR_ALLOWLIST: string[] = [];

const MIN_HTML_BYTES = 5_000; // snapshots with inlined CSS are never tiny
const MIN_PNG_BYTES = 1_000;

const failures: string[] = [];
const warnings: string[] = [];
const check = (ok: boolean, message: string) => {
  if (!ok) failures.push(message);
};

function main() {
  // ---- 1. Flow map: exists, parses, structurally sound ----
  const flowMapPath = path.join(UX_OUT, "ux-flow-map.json");
  check(fs.existsSync(flowMapPath), "ux-flow-map.json missing — run pnpm ux:extract");
  if (!fs.existsSync(flowMapPath)) return finish();

  const flowMap = JSON.parse(fs.readFileSync(flowMapPath, "utf-8")) as FlowMap;
  check(flowMap.version === 1, `flow map version is ${flowMap.version}, expected 1`);
  check(Array.isArray(flowMap.routes), "flow map: routes is not an array");
  check(Array.isArray(flowMap.chrome), "flow map: chrome is not an array");
  check(Array.isArray(flowMap.stageEntries), "flow map: stageEntries is not an array");

  for (const r of flowMap.routes ?? []) {
    check(typeof r.id === "string" && r.id.length > 0, `route with missing id: ${JSON.stringify(r).slice(0, 80)}`);
    check(typeof r.path === "string" && r.path.startsWith("/"), `route "${r.id}": bad path "${r.path}"`);
    check(typeof r.feature === "string" && r.feature.length > 0, `route "${r.id}": empty feature`);
    check(Array.isArray(r.aliases) && Array.isArray(r.requiredScope), `route "${r.id}": aliases/requiredScope not arrays`);
    check(Array.isArray(r.transitions) && Array.isArray(r.stories), `route "${r.id}": transitions/stories not arrays`);
  }

  // ---- 2. Registry coverage: every declared route id appears exactly once ----
  const seen = new Map<string, number>();
  for (const r of flowMap.routes) seen.set(r.id, (seen.get(r.id) ?? 0) + 1);
  for (const id of ROUTE_IDS) {
    check(seen.get(id) === 1, `route id "${id}" appears ${seen.get(id) ?? 0} time(s) in the flow map (want 1)`);
  }

  // ---- 3. Every transition target resolves ----
  const routeIds = new Set(flowMap.routes.map((r) => r.id));
  const owners = [
    ...flowMap.routes.map((r) => ({ owner: `route "${r.id}"`, transitions: r.transitions })),
    ...flowMap.chrome.map((c) => ({ owner: c.source, transitions: c.transitions })),
  ];
  for (const { owner, transitions } of owners) {
    for (const t of transitions) {
      check(routeIds.has(t.to), `${owner}: transition "${t.key}" targets unknown route "${t.to}"`);
    }
  }
  for (const s of flowMap.stageEntries) {
    check(routeIds.has(s.to), `stage "${s.stage}": entry route "${s.to}" is unknown`);
  }

  // ---- 4. Story coverage per route ----
  for (const r of flowMap.routes) {
    const primaries = r.stories.filter((s) => s.isPrimary).length;
    if (r.stories.length === 0) {
      (STRICT_PAGES ? failures : warnings).push(`route "${r.id}" has no stories`);
    } else {
      check(primaries === 1, `route "${r.id}" has ${primaries} primary stories (want 1)`);
    }
  }

  // ---- 5. Export artifacts: report, per-story html+png, manifest ----
  const reportPath = path.join(UX_OUT, "export-report.json");
  check(fs.existsSync(reportPath), "export-report.json missing — run pnpm ux:export");
  const metaPath = path.join(ROOT, "build", "meta.json");
  check(fs.existsSync(metaPath), "build/meta.json missing — run pnpm ladle:build");

  if (fs.existsSync(reportPath) && fs.existsSync(metaPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, "utf-8")) as {
      failed: string[];
      filter: string | null;
      stories: Record<string, { consoleErrors: string[] }>;
    };
    check(report.filter === null, `export-report was produced with --filter "${report.filter}" — run a full pnpm ux:export before verifying`);
    check(report.failed.length === 0, `export report lists FAILED stories: ${report.failed.join(", ")}`);

    for (const [id, story] of Object.entries(report.stories)) {
      const offending = story.consoleErrors.filter(
        (e) => !CONSOLE_ERROR_ALLOWLIST.some((allowed) => e.includes(allowed)),
      );
      check(offending.length === 0, `story "${id}" logged console errors: ${offending.join(" | ").slice(0, 300)}`);
    }

    const manifestPath = path.join(UX_OUT, "screenshots", "manifest.json");
    check(fs.existsSync(manifestPath), "screenshots/manifest.json missing");
    const manifest = fs.existsSync(manifestPath)
      ? (JSON.parse(fs.readFileSync(manifestPath, "utf-8")) as Record<string, { width: number; height: number }>)
      : {};

    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8")) as { stories: Record<string, unknown> };
    for (const id of Object.keys(meta.stories)) {
      const html = path.join(UX_OUT, "static", `${id}.html`);
      const png = path.join(UX_OUT, "screenshots", `${id}.png`);
      check(fs.existsSync(html) && fs.statSync(html).size >= MIN_HTML_BYTES, `static html for "${id}" missing or under ${MIN_HTML_BYTES}B`);
      check(fs.existsSync(png) && fs.statSync(png).size >= MIN_PNG_BYTES, `screenshot for "${id}" missing or under ${MIN_PNG_BYTES}B`);
      check(!!manifest[id]?.width && !!manifest[id]?.height, `manifest has no dimensions for "${id}"`);

      if (fs.existsSync(html)) {
        const content = fs.readFileSync(html, "utf-8");
        check(!/<script\b/i.test(content), `static html for "${id}" contains a <script> tag`);
        check(/<style>/.test(content), `static html for "${id}" has no inlined <style>`);
      }
    }

    // ---- 6. Flow-map stories ↔ artifacts cross-check ----
    for (const r of flowMap.routes) {
      for (const s of r.stories) {
        check(
          fs.existsSync(path.join(UX_OUT, "static", `${s.storyId}.html`)),
          `flow-map story "${s.storyId}" (route "${r.id}") has no static html`,
        );
        check(
          fs.existsSync(path.join(UX_OUT, "screenshots", `${s.storyId}.png`)),
          `flow-map story "${s.storyId}" (route "${r.id}") has no screenshot`,
        );
      }
    }
  }

  finish();
}

function finish() {
  for (const w of warnings) console.warn(`  ⚠ ${w}`);
  if (failures.length) {
    console.error(`verify-artifacts FAILED (${failures.length}):`);
    for (const f of failures) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("verify-artifacts OK — flow map, exports, screenshots, and manifest are all consistent.");
}

main();
