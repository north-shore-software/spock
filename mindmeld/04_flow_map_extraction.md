# Phase 4 — Flow-Map Extraction

**Goal:** `pnpm ux:extract` emits `ux-out/ux-flow-map.json` — the single data contract
the canvas (Phase 5) renders. It is produced by **importing the exact modules the app
runs** (the route registry and the chrome transition files) and serializing them, then
joining with Ladle's `build/meta.json` to attach story/screenshot ids. No AST parsing,
no browser introspection, no parallel data source.

**Scripts only — no app code changes.**

**Prerequisites:** Phase 1 (registry + `*.transitions.ts` convention + scripts
tooling: `vite-node`, `dom-prelude`, tauri stubs, `vite.config.scripts.ts`).
Phase 2/3 outputs are joined in when present.

**Read first:**
- `src/routes/registry.ts`, `src/routes/route-kit.ts`, `src/routes/route-ids.ts`
- `scripts/validate-routes.ts` (Phase 1) — this phase's script is its bigger sibling
  and reuses the same prelude/config
- A built `build/meta.json` — confirm the exact shape of `meta.stories` (keys are
  story ids like `pages--stream--default`; values include the story `name` and
  grouping info; check what fields exist rather than assuming)

---

## Subphase 4.1 — The extractor

### The output schema

Write this type in `scripts/lib/flow-map-schema.ts` and have both the extractor and
(later, via a copy — see Phase 5 note) the canvas use it:

```ts
export type FlowMapTransition = {
  key: string;            // the transition's key in its Record, e.g. "openImport"
  to: string;             // target route id
  trigger: string;
  when?: string;
  animation?: string;
};

export type FlowMapStory = {
  storyId: string;        // ladle id, e.g. "pages--stream--default"
  name: string;           // export name, e.g. "Default"
  isPrimary: boolean;     // true for the "Default" story
};

export type FlowMapRoute = {
  id: string;
  path: string;
  aliases: string[];
  feature: string;
  requiredScope: string[];
  transitions: FlowMapTransition[];
  stories: FlowMapStory[]; // empty array if none exist yet
};

export type FlowMapChromeSource = {
  source: string;          // "chrome:nav-sidebar"
  label: string;           // "Navigation Sidebar"
  transitions: FlowMapTransition[];
};

export type FlowMapStageEntry = {
  stage: string;           // e.g. "no_kalaidoscopes_available"
  to: string;              // route id from stageEntryRoute
};

export type FlowMap = {
  version: 1;
  generatedAt: string;     // ISO timestamp
  routes: FlowMapRoute[];
  chrome: FlowMapChromeSource[];
  stageEntries: FlowMapStageEntry[];
};
```

### `scripts/extract-flow-map.ts`

Structure (mirror `validate-routes.ts`: prelude first, dynamic imports after):

```ts
import "./dom-prelude";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";

async function main() {
  const { appRoutes } = await import("../src/routes/registry");
  const { stageEntryRoute } = await import("../src/routes/route-kit");
  // …build the FlowMap…
}
main();
```

1. **Routes:** map every `RouteDef` in `appRoutes` to a `FlowMapRoute`
   (`transitions` = `Object.entries(def.transitions)` → `{ key, ...def }`).

2. **Chrome transitions:** discover via Vite's glob so no manifest is needed —
   `import.meta.glob("../src/**/*.transitions.ts", { eager: true })` (vite-node
   supports `import.meta.glob`; alternatively `{ eager: false }` + awaited entries if
   eager evaluation causes import-order problems with the prelude — prefer lazy +
   await to be safe). For each module, for each export: include it iff it has the
   `ChromeTransitions` shape (`typeof v === "object" && typeof v.source === "string"
   && v.source.startsWith("chrome:")`). Page transition objects (plain Records from
   `defineTransitions`) are already covered via the registry — skip anything without
   a `source` field.

3. **Stage entries:** enumerate every `AppStage["stage"]` string literal. Keep the
   list in the extractor (`const STAGES = ["bootstrap", "bootstrap_error", …] as const`)
   and add a compile-time exhaustiveness check
   (`satisfies readonly AppStage["stage"][]` plus a check that a
   `Record<AppStage['stage'], true>` built from it typechecks) so a new stage in the
   app is a type error here — that keeps this functional-by-construction rather than
   a silently stale copy. For each stage, call the real `stageEntryRoute` with a
   minimal stage object (stages carrying payloads need dummy ids — that's fine, only
   `.stage` drives the switch; construct with `as AppStage`).

4. **Stories join:** if `build/meta.json` exists, for each route collect story ids
   starting with `pages--<route.id>--`. `isPrimary` = story id ends with `--default`
   (Ladle lowercases export names in ids — verify against real meta.json). Sort
   primary first. If `meta.json` is missing, emit routes with empty `stories` and
   print a warning telling the operator to run `pnpm ladle:build`.

5. Validate before writing: every transition target (routes AND chrome AND stage
   entries) resolves to a known route id; fail hard otherwise (this subsumes
   `validate-routes` at extract time; keep `check:routes` anyway — it's the fast
   pre-commit check).

6. `mkdirSync("ux-out", { recursive: true })`;
   write `ux-out/ux-flow-map.json` pretty-printed (2-space indent, stable key order —
   sort routes by feature then id) so diffs are reviewable.

Wire up: `"ux:extract": "vite-node -c vite.config.scripts.ts scripts/extract-flow-map.ts"`.

### Acceptance 4.1
- `pnpm ux:extract` runs after `pnpm ladle:build`; the JSON contains all 18 routes,
  every chrome source you created in Phase 1, and one stage entry per app stage.
- Every route that has Phase 2 stories shows them, with exactly one `isPrimary`.
- Hand-verify 3 routes against their source files (path, scope, transitions match).

---

## Subphase 4.2 — Drift guards

Extend `scripts/verify-ux-artifacts.ts` (Phase 3) — or, if Phase 3 isn't built yet,
create the flow-map checks as `scripts/verify-flow-map.ts` and fold them into the
Phase 3 verifier later:

1. `ux-flow-map.json` parses and structurally matches the schema (hand-rolled check
   of required fields is fine; do not add a JSON-schema library).
2. Every route id in `route-ids.ts` appears exactly once.
3. Every transition target resolves.
4. Story linkage: every route has ≥ 1 story and a primary story (warning until
   Phase 2 is done, then a failure — share the `STRICT_PAGES` flag with Phase 3).
5. Cross-check with Phase 3 outputs when present: every `FlowMapStory.storyId` has a
   matching `.html` and `.png` in `ux-out/`.

Add the full pipeline command to `package.json`:

```jsonc
"ux:all": "pnpm ux:export && pnpm ux:extract && pnpm ux:verify"
```

(`ux:export` already runs `ladle:build`, so `ux:extract` finds a fresh `meta.json`.)

### Acceptance 4.2 (= Phase 4 exit criteria)
- `pnpm ux:all` passes end-to-end.
- Drift drill (do all three, revert after each):
  a. Add a transition targeting a valid route but delete the route def import from
     the registry → extract fails.
  b. Rename a page story title so it no longer matches its route id → verifier
     flags the route as story-less.
  c. Add a new value to `AppStage` in `use-app-state.ts` → `ux:extract` fails to
     compile until the extractor's stage list is updated.
