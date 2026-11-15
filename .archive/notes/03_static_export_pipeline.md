# Phase 3 — Static Export Pipeline (standalone HTML + screenshots)

**Goal:** one command crawls the built Ladle app and writes, for every story:
1. `ux-out/static/<storyId>.html` — a **fully self-contained** HTML file that renders
   correctly when opened via `file://` (no server, no network, no external files), and
2. `ux-out/screenshots/<storyId>.png` — a screenshot for the canvas.

Plus a verifier that fails loudly on empty/broken output.

**Scripts only — no app code changes.** Can be developed against the existing
component stories any time after Phase 1; page stories from Phase 2 flow through
automatically once they exist.

**Prerequisites:** Phase 1 (for the scripts tooling conventions). Phase 2 improves
coverage but is not required to build this.

**Read first:**
- `.ladle/config.mjs` (port 61000, stories glob)
- `src/index.css` (Tailwind v4 entry; note `@fontsource-variable/*` imports and the
  `@source "../src"` directive; note the app is dark-first with a `.dark` class)
- `node_modules/@ladle/react/lib/app/index.html` (the built shell — root element is
  `<div id="ladle-root">`)
- Ladle docs/behavior to verify: story preview mode is
  `/?story=<id>&mode=preview` and the built output dir is `build/` containing
  `meta.json` with a `stories` object keyed by story id. Confirm both against a real
  `pnpm ladle:build` before writing code.

**Key technical facts (why the naive approach fails):**
- The built Ladle bundle loads JS as ES modules and CSS via `<link>` with absolute
  `/assets/...` URLs — both break under `file://`. Therefore exports are **static DOM
  snapshots**: rendered markup + inlined CSS, scripts stripped.
- The compiled CSS references font files (`url(/assets/geist-….woff2)`) and possibly
  images. Those references must be rewritten to base64 `data:` URIs or the export
  falls back to system fonts.
- Radix/Base-UI portals (dialogs, popovers, drawers) render as children of `<body>`,
  NOT inside `#ladle-root` — snapshot the whole document, not the root div.
- SWR/streaming means "networkidle" may never fire — use content-based readiness
  plus a settle delay, not networkidle alone.

---

## Subphase 3.1 — The exporter script

### Step 0: dependencies & layout

In `open/app`:
```
pnpm add -D playwright
pnpm exec playwright install chromium
```
New files: `scripts/export-stories.ts` (main), `scripts/lib/static-server.ts`,
`scripts/lib/inline-assets.ts`. Output root: `ux-out/` — add `ux-out/` to
`open/app/.gitignore` (create the file if missing).

### Step 1: tiny static file server (`scripts/lib/static-server.ts`)

No new deps — Node `http` + a small extension→MIME map (html, js, css, json, svg,
png, woff2, woff, ttf). Serve files from a root dir; unknown paths fall back to
`index.html` (Ladle is an SPA). Export `startServer(rootDir, port): Promise<() => void>`.

### Step 2: asset inliner (`scripts/lib/inline-assets.ts`)

Two pure functions, unit-testable by hand:

```
inlineCssUrls(css: string, resolveFile: (ref: string) => Buffer | null): string
```
Finds `url(...)` occurrences (handle quotes and both `/assets/x` and relative
`./x` / `x` forms), resolves each via the callback (which looks in `build/assets/`
and `build/`), and replaces with `url(data:<mime>;base64,…)`. Unresolvable refs:
leave in place and record a warning. Skip refs already `data:` or `http(s):`.

```
buildStandaloneHtml(input: {
  title: string;
  htmlAttrs: string;        // e.g. `class="dark" lang="en"` captured from the live page
  bodyAttrs: string;
  bodyInnerHtml: string;    // full body snapshot (includes portals)
  inlineStyles: string[];   // all resolved+inlined stylesheets, in document order
}): string
```
Emits a complete document: doctype, `<html {htmlAttrs}>`, head with `<meta charset>`,
`<title>`, one `<style>` per stylesheet, `<body {bodyAttrs}>` with the snapshot.
No `<script>` tags — post-process the body snapshot with a regex strip of
`<script[\s\S]*?</script>` as a safety net.

### Step 3: main exporter (`scripts/export-stories.ts`)

Flow (single Chromium instance, sequential pages is fine; parallelize only if slow):

1. Unless `--no-build` is passed: run `pnpm ladle:build` via `child_process.execSync`
   (cwd = app root, `stdio: "inherit"`).
2. Read `build/meta.json`; story ids = `Object.keys(meta.stories)`. Support a
   `--filter <substring>` CLI arg for fast iteration.
3. Read every `.css` file in `build/assets/` and pre-inline their `url()` refs via
   `inlineCssUrls` (cache by filename).
4. `startServer("build", 61999)`; launch Playwright Chromium,
   `viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2`.
5. Per story id:
   - Attach a console listener collecting `error`-type messages (and pageerrors).
   - `page.goto("http://localhost:61999/?story=" + id + "&mode=preview")`.
   - Readiness: `await page.waitForFunction(() => { const r = document.querySelector("#ladle-root"); return r && r.innerHTML.trim().length > 0; }, { timeout: 15000 })`,
     then `await page.waitForTimeout(750)` to let SWR fixtures/skeleton transitions
     settle. On timeout: record the story as FAILED, continue.
   - Capture in one `page.evaluate`:
     `htmlAttrs` / `bodyAttrs` (serialize each attribute of `document.documentElement`
     and `document.body`), `document.body.innerHTML`, and the hrefs of
     `link[rel=stylesheet]` plus the text of every inline `<style>` in document order.
   - Map stylesheet hrefs to the pre-inlined CSS from step 3 (match by basename);
     keep inline `<style>` texts as-is but run them through `inlineCssUrls` too.
   - Inline `<img src>` and `<source srcset>` in the body snapshot that point into
     the build dir → data URIs (same resolver). Leave external http(s) images alone
     but log a warning (they'll be broken offline).
   - Write `ux-out/static/<id>.html` via `buildStandaloneHtml` (story ids are already
     filesystem-safe slugs).
   - Screenshot (see 3.2) in the same visit.
   - Record `{ id, ok, consoleErrors, warnings }`.
6. Write a machine-readable run report to `ux-out/export-report.json`:
   `{ generatedAt, total, failed: [...], consoleErrors: { [id]: [...] }, warnings }`.
   Print a human summary. Exit non-zero if any story FAILED to render (console
   errors alone don't fail the exporter — the verifier judges those).

Wire up: `"ux:export": "vite-node -c vite.config.scripts.ts scripts/export-stories.ts"`
in `package.json`. (vite-node runs TS scripts directly; Playwright works fine under it.
If vite-node fights Playwright for any reason, fall back to `tsx` as a devDep — note
it in the commit message.)

### Acceptance 3.1
- `pnpm ux:export` completes; `ux-out/static/` contains one `.html` per story in
  `build/meta.json`.
- Open 5 sampled files (including at least one page story if Phase 2 has landed, and
  one story with a dialog/popover open if one exists) directly from the file manager:
  correct fonts (Geist, not system fallback — compare against Ladle in the browser),
  correct colors/theme, no blank page, no layout explosions.
- `grep -L "data:font" ux-out/static/*.html` — spot-check that font embedding
  actually happened (files using text should embed at least one font).
- A story with `--filter` exports in seconds (iteration loop works).

---

## Subphase 3.2 — Screenshots

Part of the same crawl (step 5 above), not a separate pass:

- `await page.screenshot({ path: "ux-out/screenshots/" + id + ".png", fullPage: true })`.
- Fixed viewport 1440×900 @2x (set at context creation) so canvas cards are
  visually comparable; `fullPage` captures tall pages.
- Also write `ux-out/screenshots/manifest.json`:
  `{ [storyId]: { width, height } }` (read dimensions from the PNG buffer via
  Playwright's return value or the PNG header bytes 16–24) — Phase 5 needs aspect
  ratios for layout **before** loading images.

### Acceptance 3.2
- One PNG per story; sampled PNGs visually match the story in Ladle.
- `manifest.json` dimensions match the PNGs.

---

## Subphase 3.3 — Verifier

`scripts/verify-ux-artifacts.ts`, wired as
`"ux:verify": "vite-node -c vite.config.scripts.ts scripts/verify-ux-artifacts.ts"`.

Checks (all must pass; print a table, exit 1 on any failure):
1. `build/meta.json` exists; `ux-out/static/` and `ux-out/screenshots/` are non-empty.
2. Every story id in `meta.json` has both an `.html` (> 5 KB — snapshots with inlined
   CSS are never tiny) and a `.png` (> 1 KB).
3. Every `.html` contains no `<script` tag and at least one `<style>` block.
4. `ux-out/export-report.json` shows zero FAILED stories.
5. Console errors from the report: fail on any story whose console errors are not on
   an explicit allowlist kept at the top of the verifier (start empty; every
   allowlist entry needs a comment justifying it).
6. If Phase 2 is complete: every route id in `src/routes/route-ids.ts` has at least
   one `pages--<id>--*` story exported (import `ROUTE_IDS` — this is why the verifier
   runs under the scripts vite config). Emit a warning instead of a failure until
   Phase 2 is marked done; then flip to failure (leave a `STRICT_PAGES` const).

Add the combined command to `package.json`:
```jsonc
"ux:build-artifacts": "pnpm ux:export && pnpm ux:verify"
```

### Acceptance 3.3 (= Phase 3 exit criteria)
- `pnpm ux:build-artifacts` passes end-to-end from a clean checkout (after
  `pnpm install` + Playwright browser install).
- Deliberately break one story (temporarily throw in a story render) → exporter
  marks it FAILED and `ux:verify` exits non-zero. Revert.
- Total runtime for the full story set is reasonable (< ~10 min). If not, add
  bounded concurrency (3–4 pages) before closing the phase.
