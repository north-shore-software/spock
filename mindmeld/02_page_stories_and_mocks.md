# Phase 2 — Page Stories & Mock Layer

**Goal:** every page (route) in the app renders in Ladle, in a plain browser, in every
meaningful state (populated / loading / empty / error where applicable), with no Tauri
runtime and no real backend. These stories are the raw material for the static exports
(Phase 3) and the canvas nodes (Phase 5).

**This phase is additive.** It creates stories, fixtures, and mocks. It must not
change app runtime behavior. The only app-adjacent files it may touch are
`.ladle/*` and `src/testing/*`. If a page cannot be rendered without a small
production-code refactor (rare), stop and flag it to the maintainer instead of
refactoring silently.

**Prerequisite:** Phase 1 complete (`pnpm check` passes).

**Read first:**
- `.ladle/components.tsx` and `.ladle/config.mjs`
- `src/features/colours/pages/Colours.stories.tsx` — the one existing page story
- `src/features/rotation/components/active-rotation-card.stories.tsx` — story style
- `src/features/projections/fixtures.ts` — fixture style (typed against generated
  PocketBase types from `src/api/kalaidoscope/types.ts`)
- `src/hooks/use-collection.ts` — how pages fetch data (SWR over
  `client.collection(name).getFullList(params)`)
- `src/hooks/use-kalaidoscope-client.ts` — the client context pages need
- `src/api/app/settings.ts`, `src/api/app/os-integrations.ts`,
  `src/api/app/local-scopes.ts`, `src/api/app/ingest-file.ts` — the full Tauri surface

---

## Subphase 2.1 — Tauri mocks for the browser

Pages call `src/api/app/*` functions which call `@tauri-apps/*` modules. In Ladle
(plain browser) those calls hang or throw. Strategy: **alias the `@tauri-apps/*`
modules to working in-memory fakes in Ladle's Vite config**, so the real
`src/api/app/*` code runs unmodified over fake plumbing. Do NOT mock at the
`src/api/app` layer — running the real wrapper code keeps stories honest.

### Step 1: upgrade the Phase 1 stubs into fakes

Phase 1 created throwing stubs in `src/testing/tauri-stubs/`. Give them working
browser-safe behavior (keep the same files/paths — the scripts config from Phase 1
keeps working):

- `plugin-store.ts`: `load()` resolves to an in-memory `Map`-backed object
  implementing the `Store` methods the app uses (`get`, `set`, `save`, … — grep
  `src/api/app/settings.ts` for the exact set). Export a `seedMockStore(values)`
  helper so stories can preset settings (e.g. `lightDarkMode`).
- `api-event.ts`: `listen()` resolves to a no-op unlisten function; keep an in-memory
  emitter and export `emitMockEvent(name, payload)` so stories can simulate Rust
  events later if needed.
- `plugin-dialog.ts`: `open()` resolves to a configurable fake path
  (default `"/Users/demo/Documents/example.md"`); export `setMockDialogResult(v)`.
- `plugin-opener.ts`: `openUrl()` logs via `console.log("[mock] openUrl", url)`.
- `api-core.ts` (or wherever `invoke` lives — match Phase 1): `invoke(cmd, args)`
  logs and resolves `null` by default; export `setMockInvokeHandler(cmd, fn)` for
  commands stories need to succeed (check `src/api/app/local-scopes.ts` and
  `ingest-file.ts` for which commands exist and what they must return).

Every export name the real module has (that the app imports) must exist in the fake —
run `grep -rn "from \"@tauri-apps" src/` and cross-check each import clause.

### Step 2: Ladle-specific Vite config

Ladle supports pointing at a custom Vite config. Create `.ladle/vite.config.ts`:

```ts
import path from "path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const app = (p: string) => path.resolve(__dirname, "..", p);

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@tauri-apps/api/core": app("src/testing/tauri-stubs/api-core.ts"),
      "@tauri-apps/api/event": app("src/testing/tauri-stubs/api-event.ts"),
      "@tauri-apps/plugin-store": app("src/testing/tauri-stubs/plugin-store.ts"),
      "@tauri-apps/plugin-dialog": app("src/testing/tauri-stubs/plugin-dialog.ts"),
      "@tauri-apps/plugin-opener": app("src/testing/tauri-stubs/plugin-opener.ts"),
      "@": app("src"),
    },
  },
});
```

and reference it from `.ladle/config.mjs` (`viteConfig: ".ladle/vite.config.ts"` —
check the exact option name against the installed Ladle's types in
`node_modules/@ladle/react/lib/shared/types.ts`; it exists as a CLI/config option).
Keep the existing `stories`, `port`, and `addons` settings.

**Verify immediately:** `pnpm ladle` still serves the existing 69 stories unbroken,
and the aliases are active (add a temporary story that calls
`openFilePicker()` from `src/api/app/os-integrations.ts` and confirm it resolves the
fake path instead of throwing).

### Acceptance 2.1
- `pnpm ladle` and `pnpm ladle:build` both succeed; existing stories unaffected.
- A page that touches Tauri on mount (e.g. Settings, if it reads settings) renders in
  Ladle without console errors.

---

## Subphase 2.2 — Mock kalaidoscope client + `PageStory` harness

### Step 1: `src/testing/mock-kalaidoscope-client.ts`

Pages read data via `useCollection`, which calls
`client.collection(name).getFullList(params)` and keys SWR caches on
`client.baseURL`. A hand-rolled fake is enough — no MSW, no network:

```ts
import type { CollectionResponses, TypedPocketBase } from "@/api/kalaidoscope/types";

export type CollectionFixtures = Partial<{
  [N in keyof CollectionResponses]: CollectionResponses[N][];
}>;

export type MockClientOptions = {
  fixtures?: CollectionFixtures;
  /** Never resolve — freezes pages in their loading state. */
  pending?: boolean;
  /** Reject every request — drives error states. */
  failing?: boolean;
  /** Artificial delay in ms before resolving (default 0). */
  delay?: number;
};

let instance = 0;

export function createMockKalaidoscopeClient(opts: MockClientOptions = {}): TypedPocketBase {
  const { fixtures = {}, pending = false, failing = false, delay = 0 } = opts;
  // Unique baseURL per instance so SWR never serves one story's cache to another.
  const baseURL = `mock://kalaidoscope-${instance++}`;

  const collection = (name: string) => ({
    getFullList: async (_params?: unknown) => {
      if (pending) return new Promise(() => {});
      if (delay) await new Promise((r) => setTimeout(r, delay));
      if (failing) throw new Error(`[mock] request to "${name}" failed (failing: true)`);
      return (fixtures as Record<string, unknown[]>)[name] ?? [];
    },
    // Extend with getOne/getList/create/update/subscribe as pages need them —
    // check each page's client usage as you write its story and add methods here.
  });

  return { baseURL, collection } as unknown as TypedPocketBase;
}
```

Extend this file (not per-story hacks) whenever a page uses a client capability the
mock lacks. The cast is deliberate: the mock implements the used surface, not all of
PocketBase. If a page uses raw `client.send(...)` or auth, add those.

### Step 2: `src/testing/page-story.tsx`

One harness for all page stories. The Ladle global provider (`.ladle/components.tsx`)
already wraps every story in `ThemeProvider` + `MemoryRouter`; the harness must NOT
nest another router — it navigates the existing one and mounts real `<Route>`s so
`useParams` works:

```tsx
import { useEffect, useState, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { KalaidoscopeClientContext } from "@/hooks/use-kalaidoscope-client";
import { appState, type AppStage } from "@/hooks/use-app-state";
import type { RouteDef } from "@/routes/route-kit";
import { createMockKalaidoscopeClient, type MockClientOptions } from "./mock-kalaidoscope-client";

export type PageStoryProps = {
  route: RouteDef;
  /** Concrete URL to render, e.g. "/stream/frag-1". Defaults to route.path if param-free. */
  url?: string;
  /** App stage for the story. Defaults to an open kalaidoscope. */
  stage?: AppStage;
  client?: MockClientOptions;
  children?: ReactNode; // optional extra providers
};

const DEFAULT_STAGE: AppStage = { stage: "kalaidoscope_open", selectedKalaidoscopeId: "ks-demo" };

export function PageStory({ route, url, stage = DEFAULT_STAGE, client, children }: PageStoryProps) {
  // Set global stage synchronously, once, before the page first renders.
  useState(() => {
    appState.appStage = stage;
    return null;
  });
  const [mockClient] = useState(() => createMockKalaidoscopeClient(client));
  const target = url ?? route.path;
  if (/[:*]/.test(target)) {
    throw new Error(`PageStory: route "${route.id}" has params — pass a concrete \`url\`.`);
  }

  const Page = route.Component;
  const element = (
    <KalaidoscopeClientContext.Provider value={mockClient}>
      {children ?? null}
      <Page />
    </KalaidoscopeClientContext.Provider>
  );

  return (
    <>
      <NavigateOnMount to={target} />
      <Routes>
        {[route.path, ...(route.aliases ?? [])].map((p) => (
          <Route key={p} path={p} element={element} />
        ))}
      </Routes>
    </>
  );
}

function NavigateOnMount({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}
```

Notes for the implementer:
- Raw `useNavigate`/`Route` here is fine — add `src/testing/` to the
  `check-navigation-discipline` allowlist (Phase 1 already anticipates this).
- The first frame renders nothing (location starts at "/"), then the effect navigates
  and the page mounts. That's acceptable; Phase 3's exporter waits for content.
- Pages not requiring a kalaidoscope (splash, settings, …) pass
  `stage={{ stage: "no_kalaidoscopes_available" }}` or whatever fits the story; the
  client mock is still provided (harmless).

### Acceptance 2.2
- A smoke story using `PageStory` for `stream` renders in Ladle with fixture data,
  loading state (`client={{ pending: true }}`), and empty state (`client={{ fixtures: {} }}`).
- `pnpm check:nav` still passes (allowlist covers `src/testing/`).

---

## Subphase 2.3 — Stories for all 18 pages

### Story file convention (load-bearing for Phases 3–5)

For each route, create `<Page>.stories.tsx` next to the page:

```tsx
import type { Story } from "@ladle/react";
import { PageStory } from "@/testing/page-story";
import { streamRoute } from "./Stream";
import { mockStreamFragments } from "../fixtures";

export default { title: "Pages / stream" }; // ← "Pages / " + EXACT route id, literal string

export const Default: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ fixtures: { view_stream: mockStreamFragments } }} />
);

export const Loading: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ pending: true }} />
);

export const Empty: Story = () => (
  <PageStory route={streamRoute} url="/stream" client={{ fixtures: {} }} />
);

export const FragmentOpen: Story = () => (
  <PageStory route={streamRoute} url="/stream/frag-1" client={{ fixtures: { view_stream: mockStreamFragments } }} />
);
```

Rules:
- **Title must be the literal string `"Pages / <route id>"`** (Ladle parses titles
  statically — no template literals). Phase 4 matches stories to routes via the
  derived story-id prefix `pages--<route-id>--`, and its verifier fails on any route
  without stories, which is what enforces this convention.
- **`Default` export is mandatory** for every page and should be the populated,
  primary state — Phase 5 uses it as the big preview.
- Additional states: include `Loading` and `Empty` wherever the page visually
  distinguishes them; add page-specific states (`Error`, drawer/modal-open variants,
  section variants) where the page has them. 2–6 stories per page is the expected
  range. Do not manufacture states the page can't actually be in.
- Fixture data goes in the feature's existing `fixtures.ts` (create one if the
  feature lacks it), typed against `src/api/kalaidoscope/types.ts`, following the
  style of `src/features/projections/fixtures.ts`. Realistic content, no lorem ipsum
  (match the tone of existing fixtures).

### Page-by-page notes (verify each by reading the page first)

- **splash, boot-error**: no data; stage-only stories
  (`stage={{ stage: "kalaidoscope_loading" }}` etc.). Trivial.
- **select-template, kalaidoscope-setup**: form pages; setup receives router `state`
  from select-template — `PageStory` may need a `state` prop added (navigate with
  state in `NavigateOnMount`). Add it when you get here.
- **settings**: reads persisted settings via the plugin-store fake — use
  `seedMockStore` for a populated variant; section stories via
  `url="/settings/<section>"` (read the page for valid sections).
- **main**: dashboard; needs `view_stream` + whatever else it queries (read
  `Main.tsx` hooks). Also uses persisted pinned/actions settings → seed the store.
- **stream**: as the worked example above.
- **import**: file-picker flow driven by the dialog fake and `invoke` handlers
  (`classifyPath` etc. — read `src/api/app/ingest-file.ts` and register mock invoke
  handlers). States: idle, file-selected/preview, importing, done — check what the
  page's own state machine supports and story the reachable ones.
- **projections / projection-detail / projection-review / new-projection**: fixtures
  largely exist in `src/features/projections/fixtures.ts`; detail/review need
  `getOne`-style client methods — extend the mock client accordingly. Use concrete
  URLs (`/projections/proj-1`, `/projections/proj-1/review/snap-2` with matching
  fixture ids).
- **reflections / new-reflection**: fixtures exist (`reflections/fixtures.ts`);
  detail-panel variants via `url="/reflections/refl-1"`.
- **colours**: replace/extend the existing `Colours.stories.tsx` with the `PageStory`
  convention and a populated Default (fixtures in `colours/fixtures.ts`).
- **connections**: read the page; likely list + empty states.
- **rotation**: fixtures exist (`rotation/fixtures.ts`).
- **chat**: the hard one — uses `useConversations`, AI SDK `useChat`, and streaming.
  Scope for this phase: `Default` = empty new-chat composer state, `History` =
  conversation list populated (mock whatever `useConversations` reads). Do NOT
  attempt to mock live streaming responses; if a static transcript state isn't
  reachable through the client mock, ship the reachable states and note the gap in
  the story file as a comment.

### Working method

Per page: read the page component and every hook it calls → identify data/Tauri
touchpoints → extend fixtures/mock client/tauri fakes as needed → write stories →
open each story in `pnpm ladle` and check (a) it renders correctly in light AND dark
theme (Ladle theme toggle), (b) the browser console is clean (no red). Fix or
document any console noise; Phase 3's verifier will fail stories with console errors.

### Acceptance 2.3 (= Phase 2 exit criteria)
- Every route id has a story file titled `Pages / <id>` with at least a `Default`
  story; all stories render without console errors in Ladle.
- `pnpm ladle:build` succeeds; `build/meta.json` contains story ids starting with
  `pages--<route-id>--` for all 18 routes (spot-check with
  `node -e "const m=require('./build/meta.json'); console.log(Object.keys(m.stories).filter(s=>s.startsWith('pages--')))"`).
- `pnpm check` still passes; `git status` shows no app runtime files modified beyond
  the sanctioned ones (`.ladle/*`, `src/testing/*`, `*.stories.tsx`, `fixtures.ts`,
  and the nav-discipline allowlist if amended).
