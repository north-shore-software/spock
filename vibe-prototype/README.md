# MindMeld Standalone

MindMeld turns a React app's Ladle stories and *functional* navigation metadata into
two artifacts:

1. **Standalone static HTML exports** — every screen, in every state, as a
   self-contained `.html` file that renders perfectly when double-clicked from the
   filesystem (`file://`, no server, fonts and images embedded). Ready for design
   review, archiving, or Figma import.
2. **An interactive UX Flow Canvas** — a pan/zoom map of the whole application:
   screens grouped into feature swimlanes, each screen's states clustered as real
   screenshots, and arrows for every possible navigation with its trigger,
   prerequisites, and constraints. Click any screenshot to open its static export.

This repository is the **iteration sandbox** for that tooling. It contains a small
**fixture app** (six routes, deliberately carrying every hard case the tooling must
survive) plus the **tooling pipeline** itself. The tooling is destined to be reused
across projects; its first consumer is the Kalaido desktop app, whose in-app
conventions this repo mirrors exactly.

If you are an AI agent working in this repo: read **[AGENTS.md](AGENTS.md)** before
changing anything. It lists the invariants that keep this system trustworthy.

## Quick start

```bash
pnpm install
pnpm exec playwright install chromium   # once — the export pipeline drives a browser

pnpm dev          # fixture app on :5173 — the canvas is at /canvas
pnpm ladle        # stories on :61000
pnpm ux:all       # ladle:build → export (HTML+screenshots) → extract (flow map) → verify
pnpm ux:probe     # browser-level verification of canvas + file:// exports
pnpm check        # check:nav + check:routes + tsc + vite build
```

`pnpm ux:all` writes everything to `ux-out/` (gitignored):

```
ux-out/
├── static/<storyId>.html         self-contained file:// exports
├── screenshots/<storyId>.png     1440×900@2x fullPage captures
├── screenshots/manifest.json     pixel dimensions per story (canvas node sizing)
├── ux-flow-map.json              the flow-map contract (schema: scripts/lib/flow-map-schema.ts)
└── export-report.json            per-story ok/fail + console errors + warnings
```

The dev server's `publicDir` is `ux-out`, so the canvas at `/canvas` reads
`/ux-flow-map.json`, `/screenshots/*`, and `/static/*` directly. Rerun `pnpm ux:all`
and reload to see changes.

## How it works

```
 src/pages/*                       src/routes/            .ladle stories
 ┌──────────────────────┐          ┌──────────────┐       ┌──────────────────┐
 │ Page component       │          │ registry     │       │ "Pages / <id>"   │
 │ + RouteDef (colocated│──imports─│ (lazy table) │       │ via PageStory    │
 │   id/path/aliases/   │          │ router +     │       │ harness          │
 │   scope/transitions) │          │ gatekeeper   │       └────────┬─────────┘
 └──────────┬───────────┘          └──────┬───────┘                │ ladle build
            │                             │                        ▼
            │      the SAME objects       │               build/ (+ meta.json)
            │                             │                        │
            ▼                             ▼                        ▼
 scripts/extract-flow-map.ts   the running app        scripts/export-pipeline.ts
 (imports registry + chrome    (navigates ONLY via    (Playwright crawl → static
  globs, serializes)            declared transitions)  HTML + screenshots)
            │                                                      │
            ▼                                                      ▼
 ux-out/ux-flow-map.json  ◄────────── consumed by ──────────  ux-out/static, screenshots
                          └──────────► src/canvas (React Flow + ELK) ◄┘
```

The one idea everything hangs on: **the metadata driving the canvas is the same data
the app runs on.** Route definitions are what the router renders; transitions are the
only way the app navigates; scope requirements are enforced at mount. The extractor
just imports those modules and serializes them. Nothing is declared twice, so the
canvas cannot drift from the app — if the metadata is wrong, the app is broken, and
the checks catch it.

## Technical decisions and why

**Transitions live in `*.transitions.ts` sibling files, not in page files.** Child
components also navigate. If transitions lived inside page files, a child importing
them would import the page while the page imports the child — an import cycle. The
sibling file keeps the graph acyclic: `page → child → transitions`.

**Transition targets are typed route-id strings (`to: "import"`), not imported
RouteDef objects.** Importing the target page's def from the source page would create
page↔page cycles. The `RouteId` union gives the same typo-safety at compile time.

**The registry's route table is built lazily (`getAppRoutes()`), never at module
scope.** Pages and the registry form a cycle by design (pages export defs; the nav
helpers pages use resolve through the registry). Runtime-lazy resolution makes the
cycle harmless — but a module-scope `const appRoutes = [streamRoute, …]` throws a TDZ
`ReferenceError` whenever a *page* is the entry point of the module graph, which is
exactly what a Ladle page story is. This shipped as a bug once; the lazy accessor is
the fix.

**Aliases + `selectPattern`.** One screen can own several URL shapes
(`/projections/:id` and `/projections/:id/snapshot/:snapshotId`). `go()` and
`<RouteLink>` pick the pattern whose required params are all provided and which
consumes the most provided params, and log a dev error when a param matches no
pattern. Call sites never contain URL strings.

**Scope enforcement happens at mount (`RouteGatekeeper`), not only in `go()`.** Deep
links, history navigation, and OS-level events bypass any hook. Wrapping every route
means a page whose prerequisites are unmet cannot render, no matter how the
navigation happened; the user is redirected to `stageEntryRoute(stage)` — a single
mapping shared with stage-driven navigation so the two can't diverge.

**Mocking happens at the lowest layer.** The Tauri stub replaces `@tauri-apps/*`
modules via vite aliases (one alias per exact specifier, in every vite config), so
the app's real API-wrapper code runs everywhere. The data mock (`createMockClient`)
implements the client *surface* with `fixtures` / `pending` / `failing` / `delay`
options, so stories drive populated/loading/empty/error states purely through data —
pages have no test-only props.

**Static exports are DOM snapshots with everything inlined.** Live ES modules and
absolute asset URLs break under `file://`, so the exporter captures rendered DOM and
inlines all CSS, with `url()` refs rewritten to base64 data URIs. Two hard-won
details: compiled CSS references fonts by **absolute** `/assets/…` paths (resolve
them against the build root — resolving an absolute path against a subdirectory is a
silent no-op), and the capture target is **`document.body` with live html/body
attributes** — never `#ladle-root` — because portals (dialogs, drawers) render as
body children and themes live in attributes.

**Readiness is content-based.** `#ladle-root` exists before a story mounts and
network-idle never fires with polling data layers. The exporter waits for the root to
have content, then a settle delay.

**The pipeline is honest or it is useless.** The exporter fails loudly (per-story
status, `export-report.json`, non-zero exit, server closed on all paths) and the
verifier checks *quality*, not existence: size floors, no `<script>` tags, console
errors gated against an allowlist that starts empty, per-story artifact cross-checks,
and story coverage per route. The previous generation of this pipeline "passed" while
producing unstyled, font-less artifacts; the verifier exists so that can't recur.

**ELK (`layered` + `INCLUDE_CHILDREN`), not dagre.** UX flows are cyclic and need
compound (swimlane) layout; `INCLUDE_CHILDREN` makes cross-lane edges shape the
layout. Node sizes are computed *before* layout from `screenshots/manifest.json` —
the DOM is never measured.

**Canvas details that came from real failures:** edge ids include the transition key
(`source:key->target`) because two transitions between the same nodes otherwise
collide and React Flow silently drops one; self-transitions render as a badge on the
node (self-edges render badly); the canvas route mounts *outside* the registry
(`src/main.tsx`) so the tooling never appears in its own flow map; tooltips render in
a fixed overlay so they stay readable at any zoom.

**Story titles are literal strings (`"Pages / stream"`).** Ladle discovers stories by
static parsing — template literals don't evaluate. The `pages--<route-id>--` slug
prefix is the join key between the flow map and the Ladle build, and the verifier
enforces coverage, which is what keeps the convention honest.

## What the fixture app deliberately exercises

| Stressor | Where |
|---|---|
| Route params | `stream` → `/stream/:id?` (URL-driven drawer) |
| Aliases + pattern selection | `projection-detail` → `/projections/:id` + `/projections/:id/snapshot/:snapshotId` |
| Scopes, gatekeeper, stage machinery | workspace routes require `kalaidoscope`; splash grants it, Main's "Exit Workspace" drops it |
| Chrome transitions | `src/chrome/app-nav.tsx` + `app-nav.transitions.ts` |
| Portals | `projection-detail`'s approve dialog (`createPortal` to `document.body`) |
| Async data: loading / empty / error | `src/testing/mock-client.ts` + `useCollection` |
| Native module imports at module level | `src/api/native-bridge.ts` imports `@tauri-apps/plugin-dialog`; aliased to stubs in every vite config |
| Multi-state stories | `PageStory` harness; 16 stories across 6 routes |

If you add tooling behaviour that none of these stressors can falsify, add a stressor
first.

## Repository layout

```
src/pages/        fixture screens; each page file exports its RouteDef,
                  with a *.transitions.ts sibling and a *.stories.tsx
src/routes/       route-kit (types + helpers), lazy registry, gatekeeper,
                  useAppNavigate, RouteLink — the only place raw react-router
                  navigation APIs are allowed
src/chrome/       shared chrome (app nav) with chrome-owned transitions
src/hooks/        app state (valtio), data hooks
src/testing/      mock client, fixtures, PageStory harness, tauri stubs
src/canvas/       the UX Flow Canvas (React Flow + ELK)
src/api/          the fixture's "native surface" (module-level Tauri import)
scripts/          export pipeline, extractor, verifier, checks, browser probe
.ladle/           Ladle config + global provider (the one MemoryRouter)
```

## Reintegration notes (for Kalaido, and any future host)

- `src/routes/` (route-kit, registry pattern, gatekeeper, nav helpers) and the check
  scripts are lockstep copies of Kalaido's `open/app/src/routes/`. Divergence here is
  the main reintegration risk. The standalone's `AppStage` is a reduced 3-stage
  version of Kalaido's.
- The host-specific knobs are: the build dir (`build/`), the output dir (`ux-out/`),
  the export port (61999), the registry module path, and the vite aliases for native
  modules. When extracting a reusable package, that list is the config surface.
- The canvas only needs the `ux-out` artifacts and `scripts/lib/flow-map-schema.ts`;
  in a host app it can live as a separately served app.
- Dependency versions track Kalaido (Ladle 5, Vite 7, react-router 7.14, valtio 2.3,
  Tailwind 4.2). Ladle is the tooling's most intimate dependency (`meta.json` shape,
  `?mode=preview`, `#ladle-root`) — don't let it drift.

## After moving this directory to its own repo

Run the full runbook in **[VERIFY-MOVE.md](VERIFY-MOVE.md)**.
