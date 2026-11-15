# Phase 5 — The UX Flow Canvas

**Goal:** a locally served, interactive pan/zoom canvas showing the entire app:
feature swimlanes containing page nodes, each page node showing its states as a
cluster of real screenshots (primary state large, variants as mini-cards), and
transition edges with trigger labels and rich tooltips. Clicking any screenshot opens
that story's standalone static HTML export. Everything renders from `ux-flow-map.json`
+ `ux-out/` artifacts — the canvas has no knowledge of the app's source code.

**New standalone app in `open/ux-canvas/`. No `open/app` runtime changes.**

**Prerequisites:** Phases 3 + 4 (artifacts to render). Develop against a real
`pnpm ux:all` output.

**Read first:**
- `ux-out/ux-flow-map.json` (real output) and `scripts/lib/flow-map-schema.ts`
- `ux-out/screenshots/manifest.json`
- The `dataviz`/design conventions do not apply here; match the app's dark aesthetic
  (see `open/app/src/index.css` design tokens for the palette to echo).

**Library decisions (fixed — do not relitigate):**
- **@xyflow/react** (React Flow v12+; the `reactflow` package name is the old v11)
  for the canvas: nodes, edges, pan/zoom, viewport controls.
- **elkjs** for layout, algorithm `layered`, direction `RIGHT`. Not dagre: UX flows
  are cyclic and need compound (cluster) layout; ELK's `layered` handles back-edges
  and hierarchical children well. Run ELK once at load over the graph, then feed
  positions to React Flow.
- Plain Vite + React + TS scaffold. Tailwind optional; plain CSS is fine for ~10
  components.

---

## Subphase 5.1 — Scaffold & data loading

1. `pnpm create vite open/ux-canvas --template react-ts` (adjust to however the repo
   prefers; keep it a sibling of `open/app`). `pnpm add @xyflow/react elkjs`.
2. Serve the artifacts: in `open/ux-canvas/vite.config.ts` set
   `publicDir: "../app/ux-out"` — then `/ux-flow-map.json`,
   `/screenshots/<id>.png`, and `/static/<id>.html` are all fetchable in dev and
   copied into a build. (`.gitignore` note: publicDir contents are generated; the
   canvas app itself is committed.)
3. Copy `flow-map-schema.ts` from `open/app/scripts/lib/` into `src/flow-map-schema.ts`
   (comment at the top: "copied from open/app/scripts/lib/flow-map-schema.ts — keep in
   sync; the verifier in open/app owns the contract"). A shared package is overkill
   for one file; do not build one.
4. `src/use-flow-data.ts`: fetch + parse the flow map and the screenshot manifest,
   expose `{ flowMap, screenshots, error }`. Render a clear full-screen error state
   telling the user to run `pnpm ux:all` in `open/app` when fetches 404.
5. Add to `open/app/package.json` for discoverability:
   `"ux:canvas": "pnpm --dir ../ux-canvas dev"`.

### Acceptance 5.1
- `pnpm ux:canvas` starts; the app loads the flow map and shows a placeholder list of
  routes; missing artifacts produce the helpful error screen, not a blank page.

---

## Subphase 5.2 — Graph construction & ELK layout

### Graph model

Build React Flow nodes/edges from the flow map:

- **Swimlane nodes**: one group node per distinct `feature`. React Flow parent nodes
  (`type: "swimlane"`, custom node rendering a translucent rounded container with the
  feature name as a header). Children reference it via `parentId`.
- **Page nodes** (`type: "page"`, child of its feature swimlane): one per route.
  Sized from its state cluster contents (see 5.3): primary screenshot at ~280 px wide
  (height from the manifest aspect ratio, capped — crop overflow with CSS
  `object-fit: cover; object-position: top`), mini-cards ~120 px wide beside/below it.
  Compute each node's pixel size BEFORE layout (ELK needs dimensions) from the
  manifest — never measure the DOM.
- **Chrome nodes** (`type: "chrome"`): one per `FlowMapChromeSource`, small pill-style
  nodes, placed in a dedicated "Chrome" swimlane.
- **Stage-entry node** (`type: "stage"`, optional single node "App stages" in the
  Chrome lane): fan-out edges labeled with the stage name for each `stageEntries`
  item. Behind a toggle, default off (it's noisy).
- **Edges**: one per transition — source = owning route/chrome node, target =
  `transition.to`'s page node, `label` = `trigger`, `data` = the full transition +
  the target's `requiredScope`. Self-transitions (`to` === own route): render as a
  small loop badge on the node ("2 internal transitions" with tooltip) instead of a
  React Flow self-edge — self-edges render badly; do not fight it.

### ELK layout (`src/layout.ts`)

- Build an ELK graph mirroring the hierarchy: root → swimlane children → page/chrome
  children; edges attached at root level with node ids.
- Options to start from (tune, don't cargo-cult):
  `"elk.algorithm": "layered"`, `"elk.direction": "RIGHT"`,
  `"elk.layered.spacing.nodeNodeBetweenLayers": "120"`,
  `"elk.spacing.nodeNode": "64"`,
  `"elk.hierarchyHandling": "INCLUDE_CHILDREN"` (this is what makes cross-swimlane
  edges influence layout — required),
  `"elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES"` (stable ordering).
- ELK returns absolute coordinates per hierarchy level; convert to React Flow's
  parent-relative child positions. Swimlane nodes get ELK's computed width/height
  plus padding.
- Layout runs async (elkjs returns a promise) once per data load; store positions in
  state; `fitView` after layout resolves.

### Acceptance 5.2
- All routes/chrome nodes appear inside the correct swimlanes with zero overlaps.
- Every transition in the flow map is visible as exactly one edge (or counted in a
  self-loop badge); no edge renders without a resolvable target.
- Layout is deterministic across reloads.

---

## Subphase 5.3 — Node & edge presentation

### Page node (`src/nodes/page-node.tsx`)

- Header: route id (bold) + `path` (monospace, dim) + scope chips (one chip per
  `requiredScope` entry, e.g. a small "kalaidoscope" badge).
- Body: **state cluster** — primary story's screenshot large; other stories as
  mini-cards in a row/grid below, each with the story name as a caption. Use
  `<img src={"/screenshots/" + storyId + ".png"} loading="lazy">`.
- Routes with no stories yet: render a dashed placeholder card ("no stories yet") —
  the canvas must not hide them, that's drift made visible.
- Click on any screenshot: `window.open("/static/" + storyId + ".html", "_blank")`.
  Add a small hover affordance ("open static render ↗").
- Stop click propagation so opening a render doesn't also select/drag the node.

### Edges (`src/edges/transition-edge.tsx`)

- Custom edge: React Flow bezier/smoothstep path, arrowhead marker, and the
  `trigger` as a centered pill label (truncate > ~28 chars with ellipsis).
- Hover (edge or label) → tooltip (fixed-position overlay, not inside the zoomed
  pane, so text stays readable at any zoom):
  - **Trigger** (full text)
  - **Requires**: target's `requiredScope` joined, or "nothing"
  - **When**: `when` if present
  - **Animation**: `animation` if present
  - **Source → Target**: `sourceId → targetId`
- Selected edge: highlight the path and both endpoint nodes (React Flow selection
  state); dim unrelated edges to 20% opacity while something is selected.

### Visual language

Dark, quiet, app-adjacent: reuse the app's token values (near-black background,
warm-neutral grays, one accent) — copy literal color values from
`open/app/src/index.css` into the canvas CSS with a comment naming the source tokens.
Swimlane containers: subtle border + translucent fill + uppercase label. Keep chrome
minimal; screenshots are the content.

### Acceptance 5.3
- Tooltips show correct data for 5 hand-checked transitions (compare against the
  `*.transitions.ts` sources).
- Click-through opens the right static HTML for 5 sampled screenshots.
- A route without stories renders as a visible placeholder.

---

## Subphase 5.4 — Controls & polish

1. **Toolbar** (top-left overlay): search input, feature-visibility toggles, "stage
   edges" toggle, zoom-to-fit button.
2. **Search**: typeahead over route ids, paths, story names, and transition triggers;
   selecting a result pans/zooms to the node (`setCenter`/`fitView` on its bounds)
   and pulses its outline.
3. **Feature toggles**: hiding a feature hides its swimlane + nodes and all connected
   edges (React Flow `hidden` flag — do NOT re-run layout on toggle; keep positions
   stable).
4. **Minimap + controls**: React Flow's built-ins, restyled to the dark theme.
5. **Empty/error states**: already covered in 5.1; make sure a *partial* artifact set
   (flow map present, screenshots missing) degrades to placeholder cards rather than
   broken images (`onError` → placeholder).
6. **README** for `open/ux-canvas/`: what it is, `pnpm ux:all` then `pnpm ux:canvas`,
   and a screenshot of the canvas itself.

### Acceptance 5.4 (= Phase 5 / project exit criteria)
- Fresh-clone drill: `pnpm install` in both apps → `pnpm ux:all` in `open/app` →
  `pnpm ux:canvas` → the full canvas renders every route with screenshots, edges,
  tooltips, search, and click-through to standalone HTML that opens correctly.
- Add a fake transition to any page's `*.transitions.ts`, re-run `pnpm ux:extract`,
  reload the canvas → the new edge appears. Remove it (this is the whole point of the
  project — demonstrate it works end-to-end).
- Maintainer walkthrough: pan, zoom, search, toggle features, open three static
  renders. Collect feedback as new issues; do not scope-creep this phase.
