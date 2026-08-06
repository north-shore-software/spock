# AGENTS.md — read before changing anything

This file is for AI agents working in this repository. It states the technical design
in brief and then the **invariants**. The invariants are not style preferences — each
one protects the property that makes this project worth having, and several encode
bugs that actually shipped. If a task you've been given appears to require violating
one, stop and surface the conflict instead of working around it.

## What this system is, in one paragraph

The app's navigation metadata is **functional**: route definitions (`defineRoute`,
colocated in page files) are what the router renders; transitions
(`defineTransitions` / `defineChromeTransitions`, in `*.transitions.ts` sibling
files) are the **only** way the app navigates; `requiredScope` is enforced at mount
by `RouteGatekeeper`. The extractor (`scripts/extract-flow-map.ts`) imports those
same modules and serializes them to `ux-out/ux-flow-map.json`; the export pipeline
(`scripts/export-pipeline.ts`) crawls the Ladle build into standalone HTML +
screenshots; the canvas (`src/canvas/`) renders both. Because nothing is declared
twice, the canvas cannot drift from the app. Every invariant below defends some link
in that chain.

## Invariants

### I1. Metadata must stay functional — the app runs on it
Never introduce metadata the running app doesn't consume (annotation-only fields,
doc-only registries, comment conventions the extractor parses). Unused metadata rots
silently and the canvas becomes a lie — the exact failure this project exists to
prevent. If you need new canvas information, wire it through something the app
actually executes, or don't add it.

### I2. All navigation goes through declared transitions
`useAppNavigate().go(transition, opts)` and `<RouteLink transition=… />` are the only
navigation paths. Raw `useNavigate` / `Link` / `NavLink` / `Navigate` from
react-router-dom are banned outside `src/routes/` and `src/testing/` — enforced by
`pnpm check:nav`. Never widen that allowlist to make a feature compile; declare a
transition instead. (`useLocation` / `useParams` are fine anywhere — they read, they
don't navigate.)

### I3. Transitions are declared in `*.transitions.ts` files — never inline
`transition={{ to: "main", trigger: "Back" }}` **type-checks and works at runtime but
is invisible to the extractor**, so the edge silently vanishes from the canvas. This
exact bug existed in this codebase. Inline `TransitionDef` object literals in JSX or
`go()` calls are forbidden. The sibling-file convention also breaks import cycles
(page → child → transitions is acyclic; transitions inside page files are not).

### I4. RouteDefs are colocated in page files; the registry only aggregates
`src/routes/registry.ts` imports each page's `RouteDef` and builds a lookup table —
nothing more. Never move definitions into the registry, never create a central
metadata module, never cast (`transitions: xTransitions as any` destroys the RouteId
typo-safety that makes `to:` targets compile-checked). Adding a page: add its id to
`ROUTE_IDS` (`src/routes/route-ids.ts`), create `Page.transitions.ts`, export the
`RouteDef` from the page file, import it in the registry. `pnpm check:routes` fails
if any step is missed.

### I5. The registry table must stay LAZY
`getAppRoutes()` and the internal `byId` map are built on first call, deliberately.
Pages ↔ registry is an import cycle (pages export defs; nav helpers resolve through
the registry). A module-scope `const appRoutes = [streamRoute, …]` throws a TDZ
`ReferenceError` whenever a page module is the entry point of the graph — which is
exactly what every Ladle page story is. This shipped as a bug. Do not "simplify" the
registry back to eager module-scope constants.

### I6. Scope enforcement lives at mount, and `stageEntryRoute` is the single fallback map
Every registry route renders through `RouteGatekeeper` (see `src/main.tsx`); `go()`'s
pre-check is UX sugar, the gatekeeper is the guarantee. `stageEntryRoute(stage)` is
used by both the gatekeeper fallback and any stage-driven navigation — never add a
second stage→route mapping. Its documented contract: the returned route's
`requiredScope` must be satisfiable in that stage (otherwise: redirect loop).

### I7. The extractor imports real modules — it never parses or duplicates
`extract-flow-map.ts` gets routes by importing the registry, chrome transitions by
glob-importing `src/**/*.transitions.ts` and shape-checking for
`defineChromeTransitions` values, and stage entries by calling the real
`stageEntryRoute`. Never replace any of this with AST parsing, regex scanning, a
hand-maintained JSON file, or a browser-runtime registry. The stage list in the
extractor is compile-time exhaustive (`satisfies` + the `_AssertAllStagesCovered`
type) — adding an `AppStage` member without updating it is a type error. Keep it that
way.

### I8. `src/index.css` must keep `@source "../src"`
Ladle sets the Vite root to its own internal app; without this directive Tailwind
generates **zero** app utilities during `ladle build`, and every story, screenshot,
and static export renders as unstyled ghost text. This shipped as a bug and nothing
crashed — only the verifier's quality checks catch it. Do not remove or "optimize"
this line.

### I9. Export capture rules
- Capture `document.body` innerHTML plus **live** `<html>`/`<body>` attributes.
  Never capture `#ladle-root` (portals render as body children — the approve-dialog
  story exists to falsify this) and never hardcode theme classes or body styles.
- Readiness is content-based (`#ladle-root` has content + settle delay). Never wait
  on `networkidle` (polling data layers never idle) or on `#ladle-root`'s existence
  (it exists before the story mounts).
- Asset inlining resolves absolute `/assets/…` refs against the **build root**
  (`buildDirResolver`). `path.resolve(assetsDir, "/abs/path")` is a silent no-op —
  that bug shipped; fonts fell back to system fonts.
- The export server port is **61999**. 61000 is the Ladle dev server.

### I10. The pipeline must fail loudly
The exporter records per-story results, writes `ux-out/export-report.json`, exits
non-zero on any failed story, and closes the server/browser on every path. The
verifier (`ux:verify`) gates on: size floors, no `<script>` tags, console errors
(allowlist starts empty — every addition needs a justifying comment), per-story
HTML+PNG existence, manifest dimensions, story coverage per route (`STRICT_PAGES`),
and flow-map ↔ artifact cross-checks. **Never weaken a threshold, blanket-allowlist
an error, or delete a check to make a run green.** A red verifier is information;
make the pipeline right instead.

### I11. Story conventions
Titles are the **literal** string `"Pages / <route-id>"` (Ladle parses statically —
template literals break discovery, and the `pages--<route-id>--` slug prefix is the
join key used by the extractor). Every route has a `Default` story (the canvas
primary). States are driven by data (`PageStory`'s `client` options: `fixtures` /
`pending` / `failing` / `delay`) and URL (`url` prop) — never by test-only props on
page components. `PageStory` rides inside the Ladle provider's single `MemoryRouter`;
never nest another router.

### I12. Canvas rules
Edge ids are `source:transitionKey->target` — two transitions between the same nodes
otherwise collide and React Flow silently drops one (shipped as a bug). Self-
transitions render as node badges, never as self-edges. ELK keeps
`"elk.hierarchyHandling": "INCLUDE_CHILDREN"` (without it, cross-lane edges don't
shape the layout). Node sizes come from `screenshots/manifest.json` before layout —
never measure the DOM. The canvas route mounts **outside** the registry
(`src/main.tsx`) so the tooling never appears in its own flow map.

### I13. Mocks replace the lowest layer, per exact specifier
Native modules are stubbed by aliasing the **exact** import specifier
(`@tauri-apps/plugin-dialog` → `src/testing/tauri-stubs/plugin-dialog.ts`) in **all
three** vite configs (`vite.config.ts`, `.ladle/vite.config` if ever split out, and
`vite.config.scripts.ts`). New native specifier → new stub file + alias in every
config, mirroring every export name the app imports. Never mock the app's own API
wrappers instead — the wrappers running for real is part of what's being tested.

### I14. This repo mirrors its host app deliberately
`src/routes/` and the check scripts are lockstep copies of Kalaido's
(`open/app/src/routes/`). Improvements are welcome but must be flagged as needing
back-porting (and vice versa). Do not let the two silently diverge — reintegration is
the whole point. Dependency versions (Ladle, Vite, react-router, valtio, Tailwind)
track the host; Ladle especially (meta.json shape, `?mode=preview`, `#ladle-root`).

## "Improvements" that are actually regressions

Each of these looks reasonable and breaks the system. All have been rejected or
shipped-and-reverted before:

- Centralizing route defs or transitions "for overview" → breaks colocation (I4) and
  usually reintroduces `as any`.
- Making the registry eager "since lazy is convoluted" → TDZ crash in every page
  story (I5).
- Capturing `#ladle-root` "since it's the story root" → loses portals (I9).
- `title: \`Pages / ${route.id}\`` "to derive the title" → Ladle finds no stories (I11).
- Waiting on `networkidle` "for robustness" → hangs forever with polling (I9).
- Allowlisting a console error "to unblock the run" → the next real error hides
  behind it (I10).
- Adding a `transitions` prop or `initialState` prop to a page "for the story" →
  states stop being data-driven, exports stop reflecting reality (I11).
- Runtime/browser introspection of Ladle's story registry for extraction → the
  registry doesn't exist; the design was rejected for cause (I7).

## Before you finish any change

```bash
pnpm check       # check:nav + check:routes + tsc + vite build — must pass
pnpm ux:all      # full pipeline — must end with "verify-artifacts OK"
pnpm ux:probe    # browser-level assertions — must end with "verify-move-probe OK"
```

If your change is to the tooling, also do one **drift drill**: break something on
purpose (an inline `useNavigate` import, a deleted artifact, a bogus transition
target), confirm the corresponding check fails, then revert. A check that can't fail
is not a check.
