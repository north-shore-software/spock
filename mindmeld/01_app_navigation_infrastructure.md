# Phase 1 — In-App Navigation Infrastructure

**Goal:** every route, scope prerequisite, and navigation transition in the app is
declared as *functional, colocated* metadata that the app itself runs on, and no other
navigation path exists. This unblocks all later phases and establishes the conventions
that ongoing feature development must follow.

**This phase modifies app runtime code. It is a pure refactor: the app must behave
identically before and after.** All work happens in `open/app/`.

**Read first (mandatory):**
- `src/routes/app-router.tsx` — the current router (JSX routes, conditional mounting)
- `src/routes/router-listeners.tsx` — stage-driven navigation + Rust menu events
- `src/hooks/use-app-state.ts` — `appState`, `AppStage`
- `src/hooks/app-state-actions.ts` — how `appState` is mutated
- `src/lib/local-kalaidoscope.ts` and `src/lib/active-kalaidoscope-client.ts`
- One full page: `src/features/fragments/pages/Stream.tsx`
- `src/components/layout/nav-sidebar.tsx` and `src/components/layout/sidebar-nav.tsx`
- Run `grep -rn "useNavigate\|<Link\|navigate(" src --include="*.tsx" --include="*.ts" | grep -v stories`
  to get the current, complete list of navigation call sites. Expect ~60.

---

## Design summary

```
src/routes/route-ids.ts      the RouteId union (single source for route ids)
src/routes/route-kit.ts      types + defineRoute/defineTransitions + scope resolver
                             + buildPath + stageEntryRoute   (no React-DOM deps,
                             importable from Node scripts)
<Page>.transitions.ts        colocated transition declarations, one per page
<Page>.tsx                   the page component + its exported RouteDef
src/routes/registry.ts       imports every page's RouteDef; the routing table
src/routes/app-router.tsx    renders <Route> per RouteDef, each wrapped in
                             RouteGatekeeper (scope enforcement at mount)
src/routes/use-app-navigate.ts  the ONLY way to navigate: go(transition, opts)
src/routes/route-link.tsx    the ONLY way to render a link: <RouteLink …>
*.transitions.ts (chrome)    transitions owned by chrome (sidebar etc.), same
                             file convention, discovered by glob in Phase 4
scripts/check-navigation-discipline.mjs   bans raw router APIs outside src/routes
scripts/validate-routes.ts   registry completeness/integrity check (vite-node)
```

Why transitions live in a **separate sibling file** (`Stream.transitions.ts`) instead
of inside the page file: child components (e.g. `reflection-detail-panel.tsx`) also
trigger navigations. If transitions lived in the page file, the child would import the
page while the page imports the child — an import cycle. The sibling file breaks it:
`page → child → transitions` and `page → transitions` only.

Why transition targets are route-id **strings** (`to: "import"`) instead of imported
RouteDef objects: importing the target page's def from the source page would create
page↔page import cycles. The `RouteId` union type gives compile-time safety instead.

---

## Subphase 1.1 — Route kit: types, scope resolver, path builder

### Step 1: `src/routes/route-ids.ts`

```ts
/** Every routable screen in the app. Adding a page = adding an id here first. */
export const ROUTE_IDS = [
  "splash",
  "boot-error",
  "select-template",
  "kalaidoscope-setup",
  "settings",
  "main",
  "stream",
  "import",
  "projections",
  "projection-detail",
  "projection-review",
  "new-projection",
  "reflections",
  "new-reflection",
  "colours",
  "connections",
  "rotation",
  "chat",
] as const;

export type RouteId = (typeof ROUTE_IDS)[number];
```

### Step 2: `src/routes/route-kit.ts`

This module must stay importable outside a browser (Phase 4 imports it under
vite-node). Only type-level React imports allowed.

```ts
import type { ComponentType } from "react";
import type { AppStage } from "@/hooks/use-app-state.ts";
import type { RouteId } from "./route-ids";

/**
 * A scope is something a screen needs to exist before it can mount.
 * Scopes are RESOLVED from real app state in `currentScope` below — a scope key
 * without a resolver clause is a compile error by construction (the switch/checks
 * below must cover it). Extend this union as the app grows (e.g. "auth").
 */
export type ScopeKey = "kalaidoscope";

/**
 * A declared navigation. These objects are the app's ONLY way to navigate
 * (see use-app-navigate.ts), so they can never drift from reality.
 * `trigger`/`when`/`animation` are canvas-facing descriptions attached to the
 * functional object; `to` is functional (resolves the destination).
 */
export type TransitionDef = {
  /** Destination route id. Typo-safe via the RouteId union. */
  to: RouteId;
  /** Human trigger, e.g. "Click a stream card". Shown on canvas edges. */
  trigger: string;
  /** Optional constraint note, e.g. "Only when a draft exists". */
  when?: string;
  /** Optional animation/feel note, e.g. "slide-left 250ms". */
  animation?: string;
};

export type RouteDef = {
  id: RouteId;
  /** react-router v7 path pattern. Optional params use `:name?`. */
  path: string;
  /** Extra patterns that resolve to the same screen (e.g. "/" for splash). */
  aliases?: string[];
  /** Canvas swimlane, e.g. "Projections". Use the feature directory name, title-cased. */
  feature: string;
  requiredScope: ScopeKey[];
  transitions: Record<string, TransitionDef>;
  Component: ComponentType;
};

export const defineRoute = (def: RouteDef): RouteDef => def;

export const defineTransitions = <T extends Record<string, TransitionDef>>(t: T): T => t;

/** Transitions owned by chrome (sidebar, switcher, …) rather than a page. */
export type ChromeTransitions = {
  /** Stable source id for the canvas, e.g. "chrome:nav-sidebar". */
  source: `chrome:${string}`;
  /** Human label for the canvas node. */
  label: string;
  transitions: Record<string, TransitionDef>;
};

export const defineChromeTransitions = (
  source: `chrome:${string}`,
  label: string,
  transitions: Record<string, TransitionDef>,
): ChromeTransitions => ({ source, label, transitions });

/** Resolve which scopes are currently satisfied, from real app state. */
export function currentScope(state: { appStage: AppStage }): Set<ScopeKey> {
  const scope = new Set<ScopeKey>();
  if (state.appStage.stage === "kalaidoscope_open") scope.add("kalaidoscope");
  return scope;
}

export function missingScope(
  def: Pick<RouteDef, "requiredScope">,
  scope: Set<ScopeKey>,
): ScopeKey[] {
  return def.requiredScope.filter((k) => !scope.has(k));
}

/**
 * Where the app belongs for a given stage. Used by BOTH the stage listener and
 * the gatekeeper fallback, so it can't drift.
 * INVARIANT: the returned route's requiredScope must be satisfiable in that stage
 * ("main" is only returned when the stage is kalaidoscope_open).
 */
export function stageEntryRoute(stage: AppStage): RouteId {
  switch (stage.stage) {
    case "kalaidoscope_open":
      return "main";
    case "bootstrap":
    case "kalaidoscope_loading":
    case "kalaidoscope_load_requested":
      return "splash";
    case "bootstrap_error":
    case "kalaidoscope_load_error":
      return "boot-error";
    case "no_kalaidoscopes_available":
      return "select-template";
  }
}

/** Interpolate params into a route pattern. Unfilled optional segments are dropped. */
export function buildPath(
  pattern: string,
  params: Record<string, string | undefined> = {},
): string {
  const out = pattern
    .split("/")
    .map((seg) => {
      if (!seg.startsWith(":")) return seg;
      const optional = seg.endsWith("?");
      const name = optional ? seg.slice(1, -1) : seg.slice(1);
      const value = params[name];
      if (value == null) {
        if (optional) return null;
        throw new Error(`buildPath: missing required param ":${name}" for "${pattern}"`);
      }
      return encodeURIComponent(value);
    })
    .filter((s): s is string => s !== null)
    .join("/");
  return out === "" ? "/" : out;
}
```

Note: keep the current behavior of `StateNavigationListener` in mind when writing
`stageEntryRoute` — today `kalaidoscope_load_requested` triggers
`switchLocalKalaidoscope` (a side effect, not a navigation) and does not navigate.
The listener keeps that side effect (see 1.3); `stageEntryRoute` returning "splash"
for it is only the *gatekeeper fallback* answer ("where should you be instead").

### Acceptance 1.1
- `pnpm build` passes (nothing imports the new files yet; they must still compile).

---

## Subphase 1.2 — Colocated route definitions on all 18 pages

For **each** page, create `<Page>.transitions.ts` next to the page file and export a
`RouteDef` from the page file. Fully worked example for Stream, then the inventory.

### Worked example: Stream

`src/features/fragments/pages/Stream.transitions.ts` (new file):

```ts
import { defineTransitions } from "@/routes/route-kit";

export const streamTransitions = defineTransitions({
  openImport: {
    to: "import",
    trigger: "Click ‘Import’ in the empty state",
    when: "Stream has no fragments",
  },
  openFragment: {
    to: "stream",
    trigger: "Click a stream card",
    when: "Opens the fragment drawer (/stream/:id)",
  },
  closeFragment: {
    to: "stream",
    trigger: "Close the fragment drawer",
  },
});
```

At the bottom of `src/features/fragments/pages/Stream.tsx` add:

```ts
import { defineRoute } from "@/routes/route-kit";
import { streamTransitions } from "./Stream.transitions";

export const streamRoute = defineRoute({
  id: "stream",
  path: "/stream/:id?",
  feature: "Fragments",
  requiredScope: ["kalaidoscope"],
  transitions: streamTransitions,
  Component: Stream,
});
```

(`Stream` is the default-exported component in the same file; reference it directly.)

### Route inventory

Derived from `src/routes/app-router.tsx` at planning time — **verify against the
current file before starting**; the app is in active development.

| id | path (+aliases) | feature | scope | component file |
|---|---|---|---|---|
| `splash` | `/splash` (alias `/`) | Boot | — | `src/features/boot/pages/Splash.tsx` |
| `boot-error` | `/boot-error` | Boot | — | `src/features/boot/pages/BootError.tsx` |
| `select-template` | `/kalaidoscope/new` | Create Kalaidoscope | — | `src/features/create-kalaidoscope/pages/SelectTemplate.tsx` |
| `kalaidoscope-setup` | `/kalaidoscope/setup` | Create Kalaidoscope | — | `src/features/create-kalaidoscope/pages/KalaidoscopeSetup.tsx` |
| `settings` | `/settings/:section?` | Settings | — | `src/features/settings/pages/Settings.tsx` |
| `main` | `/main` | Dashboard | kalaidoscope | `src/features/dashboard/pages/Main.tsx` |
| `stream` | `/stream/:id?` | Fragments | kalaidoscope | `src/features/fragments/pages/Stream.tsx` |
| `import` | `/import` | Import | kalaidoscope | `src/features/import/pages/Import.tsx` |
| `projections` | `/projections` | Projections | kalaidoscope | `src/features/projections/pages/Projections.tsx` |
| `projection-detail` | `/projections/:id` (alias `/projections/:id/snapshot/:snapshotId`) | Projections | kalaidoscope | `src/features/projections/pages/ProjectionDetail.tsx` |
| `projection-review` | `/projections/:id/review/:snapshotId` | Projections | kalaidoscope | `src/features/projections/pages/ProjectionReview.tsx` |
| `new-projection` | `/projections/new` | Projections | kalaidoscope | `src/features/projections/pages/NewProjection.tsx` |
| `reflections` | `/reflections/:id?` (alias `/reflections/:id/snapshot/:snapshotId`) | Reflections | kalaidoscope | `src/features/reflections/pages/Reflections.tsx` |
| `new-reflection` | `/reflections/new` | Reflections | kalaidoscope | `src/features/reflections/pages/NewReflection.tsx` |
| `colours` | `/colours` | Colours | kalaidoscope | `src/features/colours/pages/Colours.tsx` |
| `connections` | `/connections` | Connections | kalaidoscope | `src/features/connections/pages/Connections.tsx` |
| `rotation` | `/rotation` | Rotation | kalaidoscope | `src/features/rotation/pages/Rotation.tsx` |
| `chat` | `/chat` | Chat | kalaidoscope | `src/features/chat/pages/Chat.tsx` |

React-router v7 ranks static segments above dynamic ones, so `/projections/new`
correctly wins over `/projections/:id`, and `/reflections/new` over
`/reflections/:id?`. Verify this manually in 1.5.

### Transition inventory (starting point — confirm by reading each page)

Derive each page's transitions from its actual `navigate(...)` calls (grep results),
not from imagination. Known call sites at planning time:

- **splash / boot-error**: no user-triggered navigations (stage-driven only) → `transitions: {}` is valid.
- **select-template** → `kalaidoscope-setup` (passes router `state`; see `go` options).
- **kalaidoscope-setup**: back button uses `navigate(-1)` → use `goBack()` (see 1.4); no transitions needed unless it navigates elsewhere on success — read the file.
- **settings** → `main` (close); internal section links → self-transition `to: "settings"`.
- **main** → `reflections` (open reflection), plus whatever `Main.tsx:161` navigates to (read it) — likely `chat` with seed state and/or projections.
- **stream** → `import`, self (open/close fragment drawer).
- **import** → `stream` (two triggers: "view stream" after import, header link).
- **projections** → `new-projection`, `projection-detail`, `projection-review`.
- **projection-detail** → `projection-review`, `projections`, self (snapshot).
- **projection-review** → self (replace with pending id), `projection-detail`, `projections`.
- **new-projection** → `projections` (cancel), `projection-detail` (approve success).
- **reflections** → `new-reflection`, self (select), and via `reflection-detail-panel.tsx` self/snapshot navigations — the panel imports `reflectionsTransitions` from `Reflections.transitions.ts` directly.
- **new-reflection** → `reflections` (created → `/reflections/:id`; cancel → `/reflections`).
- **rotation** → `projection-review`.
- **colours / connections / chat**: read the files; chat receives seeded prompts via router state from `main`.

Rule: **one transition per distinct (destination, trigger) pair.** Two buttons that
both go to `/projections` with the same meaning can share one transition; a cancel
and a success that both land on `/projections` are two transitions (different
triggers).

### Acceptance 1.2
- All 18 pages export a `RouteDef`; all transitions files exist.
- `pnpm build` passes. Nothing else changed yet — the app still runs on the old router.

---

## Subphase 1.3 — Registry, registry-driven router, gatekeeper

### Step 1: `src/routes/registry.ts`

```ts
import { ROUTE_IDS, type RouteId } from "./route-ids";
import { buildPath, type RouteDef } from "./route-kit";

import { splashRoute } from "@/features/boot/pages/Splash";
import { bootErrorRoute } from "@/features/boot/pages/BootError";
// … import all 18 route defs, matching the inventory table …

export const appRoutes: RouteDef[] = [
  splashRoute,
  bootErrorRoute,
  // … all 18, any order (react-router ranks by specificity) …
];

const byId = new Map(appRoutes.map((r) => [r.id, r]));

export function routeById(id: RouteId): RouteDef {
  const def = byId.get(id);
  if (!def) throw new Error(`routeById: no RouteDef registered for "${id}"`);
  return def;
}

export function pathFor(id: RouteId, params?: Record<string, string>): string {
  return buildPath(routeById(id).path, params);
}

/** Registry integrity — throws at startup in dev if a page was forgotten. */
if (import.meta.env.DEV) {
  const missing = ROUTE_IDS.filter((id) => !byId.has(id));
  if (missing.length) throw new Error(`registry: missing RouteDefs for: ${missing.join(", ")}`);
  if (byId.size !== appRoutes.length) throw new Error("registry: duplicate route ids");
}
```

Note: import route defs **directly from page files** (`@/features/…/pages/X`), not via
feature `index.ts` barrels, to keep the import graph predictable for Phase 4.

### Step 2: rewrite `src/routes/app-router.tsx`

Replace the hand-written JSX routes and the `appStage`-conditional mounting with
registry-driven rendering. Preserve: `TitleBar`, `MemoryRouter`, both listeners, and
the `KalaidoscopeContainer` semantics (client context + `key` remount on kalaidoscope
switch + `cancelAllRequests` cleanup — keep the existing container code, just change
it from `<Outlet/>` to `children`).

```tsx
import { MemoryRouter, Navigate, Route, Routes } from "react-router-dom";
import { useSnapshot } from "valtio/react";
import { TitleBar } from "@/components/layout/title-bar";
import { appState } from "@/hooks/use-app-state.ts";
import { MenuEventListener, StateNavigationListener } from "./router-listeners";
import { appRoutes, pathFor } from "./registry";
import { currentScope, missingScope, stageEntryRoute, type RouteDef } from "./route-kit";
// … keep the existing KalaidoscopeContainer imports (client context etc.) …

export function AppRouter() {
  return (
    <>
      <TitleBar />
      <MemoryRouter>
        <StateNavigationListener />
        <MenuEventListener />
        <Routes>
          {appRoutes.flatMap((def) =>
            [def.path, ...(def.aliases ?? [])].map((path) => (
              <Route key={`${def.id}:${path}`} path={path} element={<RouteGatekeeper def={def} />} />
            )),
          )}
        </Routes>
      </MemoryRouter>
    </>
  );
}

/**
 * Mount-time scope enforcement. This is the guarantee that makes the canvas
 * trustworthy: no matter how a navigation happened (transition, OS menu event,
 * back button), a page whose requiredScope is unmet cannot render — the user is
 * redirected to the entry route for the current stage.
 */
function RouteGatekeeper({ def }: { def: RouteDef }) {
  const snap = useSnapshot(appState);
  const missing = missingScope(def, currentScope({ appStage: snap.appStage }));

  if (missing.length > 0) {
    console.warn(`[gatekeeper] blocked "${def.id}" — missing scope: ${missing.join(", ")}`);
    return <Navigate to={pathFor(stageEntryRoute(snap.appStage))} replace />;
  }

  const Page = def.Component;

  if (def.requiredScope.includes("kalaidoscope") && snap.appStage.stage === "kalaidoscope_open") {
    return (
      <KalaidoscopeContainer key={snap.appStage.selectedKalaidoscopeId}>
        <Page />
      </KalaidoscopeContainer>
    );
  }
  return <Page />;
}
```

Typing note: `useSnapshot` returns deep-readonly types; `currentScope` only reads
`appStage.stage`, so pass `{ appStage: snap.appStage as AppStage }` if tsc complains.

Redirect-loop safety: `stageEntryRoute` only returns scope-requiring routes for
stages that satisfy that scope (documented invariant in route-kit), so the redirect
target always mounts.

### Step 3: update `src/routes/router-listeners.tsx`

`StateNavigationListener` keeps its structure and the `switchLocalKalaidoscope` side
effect, but navigates via `pathFor(stageEntryRoute(…))` instead of hardcoded paths.
This deletes the duplicated stage→path mapping. `MenuEventListener` stays as-is (raw
paths from Rust; the gatekeeper covers it — this file lives in `src/routes/`, where
raw navigation is allowed).

### Acceptance 1.3
- `pnpm build` passes.
- Run the app (`pnpm tauri dev` or ask the maintainer for the preferred run mode) and
  verify: boot → splash → main flows work; opening each sidebar section works;
  switching kalaidoscopes remounts pages; when no kalaidoscope is open, navigating to
  `/stream` (e.g. via OS menu) lands on the stage entry screen instead of a blank view.

---

## Subphase 1.4 — `useAppNavigate`, `RouteLink`, migrate every call site

### Step 1: `src/routes/use-app-navigate.ts`

```ts
import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { appState } from "@/hooks/use-app-state.ts";
import { pathFor, routeById } from "./registry";
import { buildPath, currentScope, missingScope, stageEntryRoute, type TransitionDef } from "./route-kit";

export type GoOptions = {
  params?: Record<string, string | undefined>;
  replace?: boolean;
  /** Router state passed to the destination (e.g. chat seed prompt). */
  state?: unknown;
};

/** The only sanctioned way to navigate. Every call names a declared transition. */
export function useAppNavigate() {
  const navigate = useNavigate();

  const go = useCallback(
    (transition: TransitionDef, opts: GoOptions = {}) => {
      const target = routeById(transition.to);
      const missing = missingScope(target, currentScope(appState));
      if (missing.length > 0) {
        console.error(
          `[nav] blocked transition to "${target.id}" (${transition.trigger}) — missing scope: ${missing.join(", ")}`,
        );
        navigate(pathFor(stageEntryRoute(appState.appStage)), { replace: true });
        return;
      }
      navigate(buildPath(target.path, opts.params), { replace: opts.replace, state: opts.state });
    },
    [navigate],
  );

  /** History back (for explicit back buttons). Gatekeeper still applies at mount. */
  const goBack = useCallback(() => navigate(-1), [navigate]);

  return { go, goBack };
}
```

### Step 2: `src/routes/route-link.tsx`

```tsx
import { Link, type LinkProps } from "react-router-dom";
import { routeById } from "./registry";
import { buildPath, type TransitionDef } from "./route-kit";

export type RouteLinkProps = Omit<LinkProps, "to"> & {
  transition: TransitionDef;
  params?: Record<string, string | undefined>;
};

/** Declarative counterpart of useAppNavigate().go — for real links. */
export function RouteLink({ transition, params, ...rest }: RouteLinkProps) {
  return <Link to={buildPath(routeById(transition.to).path, params)} {...rest} />;
}
```

The sidebar uses Base-UI's `render={<Link to=… />}` pattern — `render={<RouteLink
transition=… />}` is a drop-in replacement. Note the gatekeeper (not RouteLink)
provides enforcement for links; RouteLink exists so link targets are declared
transitions like everything else.

### Step 3: chrome transitions

Chrome (non-page) components that navigate declare their own transitions in a
colocated `*.transitions.ts` file using `defineChromeTransitions`. Known chrome
navigation owners at planning time (grep to confirm):

- `src/components/layout/nav-sidebar.tsx` → chat, connections (+ any nav items)
- `src/components/layout/sidebar-nav.tsx` → renders `item.url` links; find where the
  items are defined, replace `url: string` with `transition: TransitionDef` in the
  item type, and declare the transitions in the defining module's sibling
  `*.transitions.ts`.
- `src/features/create-kalaidoscope/components/nav-kalaidoscope-switcher.tsx` → select-template.

Example — `src/components/layout/nav-sidebar.transitions.ts`:

```ts
import { defineChromeTransitions } from "@/routes/route-kit";

export const navSidebarTransitions = defineChromeTransitions(
  "chrome:nav-sidebar",
  "Navigation Sidebar",
  {
    openChat: { to: "chat", trigger: "Click ‘Chat’ in the sidebar" },
    openConnections: { to: "connections", trigger: "Click ‘Connections’ in the sidebar" },
    // … one per sidebar destination …
  },
);
```

**Naming convention is load-bearing for Phase 4:** chrome transition files must match
the glob `src/**/*.transitions.ts` and export a value built with
`defineChromeTransitions` (page transition files use `defineTransitions`; Phase 4
distinguishes by the `source` field).

### Step 4: migrate every call site

Work through the full grep list from "Read first". For each raw navigation:

1. Identify (or add) the transition in the owning `*.transitions.ts` file.
2. Replace `const navigate = useNavigate()` with `const { go, goBack } = useAppNavigate()`.
3. Replace `navigate("/stream")` → `go(streamTransitions.…)`;
   `navigate(\`/stream/${id}\`)` → `go(streamTransitions.openFragment, { params: { id } })`;
   `navigate(path, { replace: true })` → `go(…, { replace: true })`;
   `navigate("/kalaidoscope/setup", { state })` → `go(…, { state })`;
   `navigate(-1)` → `goBack()`.
4. Child components that navigate: either accept a callback from the page (preferred —
   many already do, e.g. `StreamEmptyState onImport`), or import the page's
   transitions file directly and call `go` themselves.
5. Replace every `<Link to=…>` outside `src/routes/` with `<RouteLink transition=… />`.

Files allowed to keep raw react-router APIs: everything under `src/routes/`, plus
`.ladle/components.tsx` (the story router). `useLocation`/`useParams` remain allowed
everywhere (they read, they don't navigate).

### Acceptance 1.4
- `grep -rn "useNavigate" src --include="*.tsx" --include="*.ts" | grep -v "src/routes/"`
  returns nothing (excluding `*.stories.tsx` and `src/testing/` if any exist by now).
- Same for `<Link`, `NavLink`, `<Navigate` outside `src/routes/`.
- `pnpm build` passes.
- Manual pass through the app: every button/link/flow listed in the transition
  inventory still navigates exactly as before.

---

## Subphase 1.5 — Enforcement scripts

No CI exists, so these are `package.json` scripts the team (and future agents) run;
they are also the drift alarms Phases 2–5 rely on.

### Step 1: `scripts/check-navigation-discipline.mjs` (plain Node, no deps)

Behavior:
- Recursively walk `src/` (skip `node_modules`, `*.stories.tsx`, `src/routes/`,
  `src/testing/`).
- For each `.ts`/`.tsx` file, find `import { … } from "react-router-dom"` clauses
  (handle multiline imports) and fail if the imported names include any of:
  `useNavigate`, `Link`, `NavLink`, `Navigate`, `useHref`.
- Print each offending `file:line` and exit 1; exit 0 otherwise.

Use `fs.readdirSync(dir, { recursive: true })` (Node ≥ 20) and a regex like
`/import\s*(?:type\s*)?\{([^}]*)\}\s*from\s*["']react-router-dom["']/g` over file
contents; split the capture on commas; strip `as` aliases and `type` prefixes before
matching names.

### Step 2: `scripts/validate-routes.ts` (run under vite-node)

This imports the real registry, which imports all pages, which import Tauri and
browser-flavored libraries — so it needs (a) DOM globals and (b) Tauri module stubs.

2a. Add devDependencies (in `open/app`): `pnpm add -D vite-node jsdom @types/jsdom`.

2b. `scripts/dom-prelude.ts` — import this FIRST in any script that imports app code:

```ts
import { JSDOM } from "jsdom";

if (typeof globalThis.window === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  g.navigator = dom.window.navigator;
  g.localStorage = dom.window.localStorage;
  g.HTMLElement = dom.window.HTMLElement;
  g.CustomEvent = dom.window.CustomEvent;
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  g.matchMedia ??= () => ({ matches: false, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {}, onchange: null, media: "", dispatchEvent: () => false });
  (dom.window as unknown as Record<string, unknown>).matchMedia ??= g.matchMedia;
}
```

If an app module still crashes at import time on a missing global, add that global
here — do not modify app code to accommodate the script.

2c. Tauri stubs. Run `grep -rn "from \"@tauri-apps" src/` and create one stub module
per specifier under `src/testing/tauri-stubs/`. Known specifiers at planning time:
`@tauri-apps/api/core` (or wherever `invoke` comes from — check `src/api/app/_invoke.ts`
and `src/api/app/local-scopes.ts`), `@tauri-apps/api/event`,
`@tauri-apps/plugin-store`, `@tauri-apps/plugin-dialog`, `@tauri-apps/plugin-opener`.
Phase 1 stubs may simply throw when *called* (import-time safety is all we need here):

```ts
// src/testing/tauri-stubs/plugin-dialog.ts
export const open = async () => {
  throw new Error("tauri stub: plugin-dialog.open called outside Tauri");
};
// mirror every export name the app imports from the real module
```

(Phase 2 will replace the throwing bodies with working in-memory fakes; keep the
files, upgrade the behavior.)

2d. `vite.config.scripts.ts` (app root) — the base config plus stub aliases:

```ts
import path from "path";
import { defineConfig } from "vite";

export default defineConfig({
  resolve: {
    alias: {
      "@tauri-apps/api/core": path.resolve(__dirname, "src/testing/tauri-stubs/api-core.ts"),
      "@tauri-apps/api/event": path.resolve(__dirname, "src/testing/tauri-stubs/api-event.ts"),
      "@tauri-apps/plugin-store": path.resolve(__dirname, "src/testing/tauri-stubs/plugin-store.ts"),
      "@tauri-apps/plugin-dialog": path.resolve(__dirname, "src/testing/tauri-stubs/plugin-dialog.ts"),
      "@tauri-apps/plugin-opener": path.resolve(__dirname, "src/testing/tauri-stubs/plugin-opener.ts"),
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
```

(Alias exact specifiers; add more if the grep finds them. Aliases must come before
`"@"`? No — Vite alias matching is exact-prefix per entry and these don't overlap.)

2e. `scripts/validate-routes.ts`:

```ts
import "./dom-prelude";

async function main() {
  const { appRoutes, routeById } = await import("../src/routes/registry");
  const { ROUTE_IDS } = await import("../src/routes/route-ids");

  const errors: string[] = [];
  const ids = new Set(appRoutes.map((r) => r.id));

  for (const id of ROUTE_IDS) if (!ids.has(id)) errors.push(`no RouteDef for id "${id}"`);
  if (ids.size !== appRoutes.length) errors.push("duplicate route ids in registry");

  const paths = new Set<string>();
  for (const r of appRoutes) {
    for (const p of [r.path, ...(r.aliases ?? [])]) {
      if (paths.has(p)) errors.push(`duplicate path "${p}" (route "${r.id}")`);
      paths.add(p);
    }
    if (!r.feature.trim()) errors.push(`route "${r.id}" has empty feature`);
    for (const [name, t] of Object.entries(r.transitions)) {
      try {
        routeById(t.to);
      } catch {
        errors.push(`route "${r.id}" transition "${name}" targets unknown route "${t.to}"`);
      }
      if (!t.trigger.trim()) errors.push(`route "${r.id}" transition "${name}" has empty trigger`);
    }
  }

  if (errors.length) {
    console.error("validate-routes FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }
  console.log(`validate-routes OK — ${appRoutes.length} routes, all transitions resolve.`);
}

main();
```

Note the **dynamic** `import()` after the prelude — a static import would hoist above
the DOM setup and crash.

### Step 3: wire into `package.json` (app root)

```jsonc
"check:nav": "node scripts/check-navigation-discipline.mjs",
"check:routes": "vite-node -c vite.config.scripts.ts scripts/validate-routes.ts",
"check": "pnpm check:nav && pnpm check:routes && pnpm build"
```

### Acceptance 1.5 (= Phase 1 exit criteria)
1. `pnpm check` passes from a clean tree.
2. Temporarily add a transition with `to: "nonexistent" as RouteId` — `tsc` rejects it
   (compile-time). Revert.
3. Temporarily delete one route def import from the registry — dev startup throws and
   `check:routes` fails. Revert.
4. Temporarily add `useNavigate` to any feature file — `check:nav` fails. Revert.
5. Full manual app pass (all flows in the transition inventory).
6. Update `CLAUDE.md` (create if absent, in `open/app/`) with a short section: how to
   add a page (route-ids → transitions file → RouteDef → registry) and the rule that
   all navigation uses `useAppNavigate`/`RouteLink`. Ongoing feature development must
   follow this from now on.
