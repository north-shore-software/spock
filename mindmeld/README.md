# MindMeld: Living UX Canvas, Driven by Functional Navigation Metadata

## What this project is

MindMeld produces two artifacts from the Kalaido app's real code:

1. **Standalone static HTML exports** of every Ladle story (components *and* full pages
   in every meaningful state), each a single self-contained `.html` file that renders
   correctly when double-clicked from the filesystem (`file://`, no server).
2. **An interactive UX Flow Canvas** — a pan/zoom web app showing every screen of the
   application, grouped into feature swimlanes, with each screen's states clustered
   side-by-side as screenshots, and arrows between screens showing every possible
   navigation transition, its trigger, and its prerequisites. Clicking a screenshot
   opens the corresponding standalone HTML export.

## The core principle: metadata must be functional

This is the load-bearing idea of the whole project, and every phase must respect it:

> **The canvas is only trustworthy if the data driving it is the same data the app
> runs on.** Navigation metadata (route paths, scope prerequisites, transitions) is
> never documentation sitting *next to* the code — it IS the code. If a transition is
> not declared, the app cannot perform it. If a scope requirement is declared, the app
> enforces it at runtime. Deleting or corrupting the metadata breaks the app, so it
> cannot silently rot.

Concrete consequences:

- Every page exports a **route definition** (`defineRoute`) colocated in its own file.
  The router renders from these definitions. There is no separate metadata registry —
  the route registry that exists is the router's own routing table, assembled from the
  colocated definitions.
- Every navigation in the app goes through a **declared transition object**
  (`go(streamTransitions.openImport)`). Raw `useNavigate` / `<Link>` from
  react-router-dom is banned outside `src/routes/` and enforced by a check script.
- Scope prerequisites (`requiredScope`) are **enforced at mount** by a gatekeeper
  wrapper around every route, so even navigations the transition system can't see
  (OS menu events, back button) cannot mount a page whose prerequisites are unmet.
- The extraction step (Phase 4) **imports the same modules the app runs** and
  serializes them. It performs no AST parsing, no runtime browser introspection, and
  reads no parallel data source.

## Repo facts (read before executing any phase)

| Fact | Value |
|---|---|
| App root | `open/app/` (all paths below are relative to it unless noted) |
| Package manager | **pnpm** (there is a `pnpm-lock.yaml`; never use npm/yarn) |
| Framework | React 19 + Vite 7 + TypeScript strict, Tailwind CSS v4 via `@tailwindcss/vite` |
| Desktop shell | Tauri v2 (`src-tauri/`); Tauri APIs used via `src/api/app/*` wrappers |
| Routing | react-router-dom v7, `MemoryRouter`, routes in `src/routes/app-router.tsx` |
| Global state | valtio proxy `appState` in `src/hooks/use-app-state.ts`; mutations via `src/hooks/app-state-actions.ts` |
| Data layer | PocketBase client per open kalaidoscope, provided via `KalaidoscopeClientContext` (`src/hooks/use-kalaidoscope-client.ts`), fetched with SWR via `useCollection` (`src/hooks/use-collection.ts`) |
| Component workshop | Ladle 5 (`pnpm ladle` → port 61000, `pnpm ladle:build` → `build/`); config in `.ladle/config.mjs`, global provider in `.ladle/components.tsx` |
| Stories today | ~69 story files, almost all for small components; only one page story (`src/features/colours/pages/Colours.stories.tsx`) |
| Fixtures | Per-feature `fixtures.ts` files already exist (e.g. `src/features/projections/fixtures.ts`); story helpers in `src/lib/story-utils.ts` |
| Path alias | `@/` → `src/` (configured in `vite.config.ts` and `tsconfig.json`) |
| CI | None (no `.github/workflows`). All checks are `package.json` scripts; run them manually/pre-commit |
| Type check / build | `pnpm build` runs `tsc && vite build` — this is the compile gate |

## Phase overview

```
Phase 1  In-app navigation infrastructure        [BLOCKING — do first, app code]
   │     route defs, transitions, gatekeeper, migration of all nav call sites,
   │     enforcement scripts. After this lands, app development continues on
   │     top of the new conventions and nothing below touches app runtime code.
   ▼
Phase 2  Page stories & mock layer               [additive: stories + mocks only]
   │     Tauri mocks, mock kalaidoscope client, PageStory helper,
   │     stories for all 18 pages in all meaningful states.
   ▼
Phase 3  Static export pipeline                  [scripts only]
   │     Playwright crawl of built Ladle → standalone HTML per story
   │     + PNG screenshot per story + verification.
   ▼
Phase 4  Flow-map extraction                     [scripts only]
   │     vite-node script imports the real route registry + chrome transitions,
   │     joins with Ladle's meta.json, emits ux-flow-map.json + validation.
   ▼
Phase 5  UX Canvas app                           [new app in open/ux-canvas]
         React Flow + elkjs canvas: swimlanes, state clusters (screenshots),
         transition edges with tooltips, click-through to static HTML.
```

**Dependency notes:**
- Phase 1 must be complete before anything else (it is also blocking active app
  development, which is why it is first).
- Phases 2–5 do not modify app runtime code. Feature development proceeds in parallel.
  New pages added during phases 2–5 must follow the Phase 1 conventions (the
  `check:routes` script fails if they don't).
- Phase 3 needs Phase 2's stories to be *useful* but not to *run* — it can be built
  and tested against the existing 69 component stories at any point after Phase 1.
- Phase 4 depends on Phase 1 (route defs) and reads Phase 2's story ids from Ladle's
  build metadata. Phase 5 depends on Phases 3 + 4 outputs.

## Phase documents

| Doc | Phase | Estimate |
|---|---|---|
| [`01_app_navigation_infrastructure.md`](01_app_navigation_infrastructure.md) | 1 — route defs, transitions, gatekeeper, migration, enforcement | 5–8 working days |
| [`02_page_stories_and_mocks.md`](02_page_stories_and_mocks.md) | 2 — Tauri/data mocks + all page stories | 8–12 working days |
| [`03_static_export_pipeline.md`](03_static_export_pipeline.md) | 3 — standalone HTML + screenshots + verification | 4–6 working days |
| [`04_flow_map_extraction.md`](04_flow_map_extraction.md) | 4 — ux-flow-map.json extraction + validation | 2–3 working days |
| [`05_ux_canvas.md`](05_ux_canvas.md) | 5 — the canvas app | 8–10 working days |

Total: roughly 6–8 weeks sequential; phases 3 and 4 can overlap with the tail of
phase 2, compressing to ~5–6 weeks with parallel effort.

Estimates assume a competent executor who follows the documents; they include
verification time but not review/iteration cycles with the maintainer.

## Output artifacts and where they live

```
open/app/ux-out/                  (gitignored — generated)
├── static/<storyId>.html         standalone file:// exports, one per story
├── screenshots/<storyId>.png     1440×900 @2x screenshots, one per story
└── ux-flow-map.json              the extracted flow map (schema in doc 04)

open/ux-canvas/                   (committed — the canvas app, Phase 5)
```

## Rules for executing agents

1. **Work phase by phase, subphase by subphase, in order.** Each subphase ends with
   explicit acceptance checks — run them and do not proceed while any fail.
2. **`pnpm build` (in `open/app`) must pass after every subphase.** It runs `tsc`;
   type errors are failures even if the dev server works.
3. **Do not "improve" app behavior while migrating it.** Phase 1 is a refactor: the
   app must behave identically afterwards (same screens, same navigations, same
   fallbacks). Behavior changes are bugs.
4. **When a document's code sample conflicts with the real codebase, the codebase
   wins.** The samples were written against the code at planning time
   (branch `mindmeld`, July 2026); adapt names/paths as needed, keep the design.
5. **Verify claims by reading the code.** Each doc lists "read first" files; read them
   before writing anything.
6. Commit at least once per subphase with a message naming the phase/subphase
   (e.g. `mindmeld 1.3: registry-driven router + gatekeeper`).
7. Anything generated goes in `ux-out/` (gitignored); never commit generated HTML,
   screenshots, or the flow map.
