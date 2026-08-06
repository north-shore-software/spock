import ELK from "elkjs/lib/elk.bundled.js";
import type { ElkNode } from "elkjs";
import type { Edge, Node } from "@xyflow/react";
import { MarkerType } from "@xyflow/react";
import type {
  FlowMap,
  FlowMapRoute,
  FlowMapStory,
  FlowMapTransition,
} from "../../scripts/lib/flow-map-schema";

export type ScreenshotManifest = Record<
  string,
  { width: number; height: number; deviceScaleFactor: number }
>;

// ---- Page card geometry (shared by layout and rendering so they can't drift) ----

export const NODE_W = 312;
export const PAD = 14;
export const HEADER_H = 56;
export const PRIMARY_W = NODE_W - PAD * 2;
export const MINI_W = 88;
export const MINI_IMG_H = 60;
export const MINI_CELL_H = MINI_IMG_H + 20; // caption below
const PLACEHOLDER_H = 72;

export type StoryCard = { storyId: string; name: string; imgH: number };

export type PageCardLayout = {
  width: number;
  height: number;
  primary: StoryCard | null;
  minis: StoryCard[];
  selfTransitions: FlowMapTransition[];
};

export function computePageCard(route: FlowMapRoute, manifest: ScreenshotManifest): PageCardLayout {
  const primaryStory: FlowMapStory | null = route.stories.find((s) => s.isPrimary) ?? route.stories[0] ?? null;
  const minis = route.stories.filter((s) => s !== primaryStory);

  const primaryImgH = (() => {
    if (!primaryStory) return 0;
    const dims = manifest[primaryStory.storyId];
    if (!dims) return 180;
    return Math.min(Math.round((PRIMARY_W * dims.height) / dims.width), 210);
  })();

  const miniRows = Math.ceil(minis.length / 3);
  const height =
    PAD +
    HEADER_H +
    (primaryStory ? primaryImgH + 8 : PLACEHOLDER_H) +
    (miniRows > 0 ? miniRows * (MINI_CELL_H + 6) : 0) +
    PAD;

  return {
    width: NODE_W,
    height,
    primary: primaryStory ? { storyId: primaryStory.storyId, name: primaryStory.name, imgH: primaryImgH } : null,
    minis: minis.map((s) => ({ storyId: s.storyId, name: s.name, imgH: MINI_IMG_H })),
    selfTransitions: route.transitions.filter((t) => t.to === route.id),
  };
}

// ---- Graph construction + ELK layout ----

const CHROME_LANE = "Chrome";
const CHROME_NODE_SIZE = { width: 210, height: 64 };
const STAGE_NODE_ID = "stage-entries";
const STAGE_NODE_SIZE = { width: 210, height: 88 };

export type PageNodeData = {
  route: FlowMapRoute;
  card: PageCardLayout;
  highlighted?: boolean;
  [key: string]: unknown;
};

export type TransitionEdgeData = {
  transition: FlowMapTransition;
  sourceLabel: string;
  targetScope: string[];
  kind: "page" | "chrome" | "stage";
  [key: string]: unknown;
};

export type LayoutResult = {
  nodes: Node[];
  edges: Edge<TransitionEdgeData>[];
  features: string[];
};

const elk = new ELK();

export async function layoutFlowMap(
  flowMap: FlowMap,
  manifest: ScreenshotManifest,
): Promise<LayoutResult> {
  const routeById = new Map(flowMap.routes.map((r) => [r.id, r]));
  const features = [...new Set(flowMap.routes.map((r) => r.feature))].sort();
  const hasChromeLane = flowMap.chrome.length > 0 || flowMap.stageEntries.length > 0;

  const cards = new Map(flowMap.routes.map((r) => [r.id, computePageCard(r, manifest)]));

  // ELK graph: lanes as compound nodes; INCLUDE_CHILDREN makes cross-lane
  // edges shape the layout (without it, lanes are laid out blind and edges
  // become spaghetti).
  const lanePadding = "[top=52,left=20,bottom=20,right=20]";
  const elkGraph: ElkNode = {
    id: "root",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.layered.spacing.nodeNodeBetweenLayers": "110",
      "elk.spacing.nodeNode": "48",
      "elk.spacing.componentComponent": "72",
      "elk.layered.considerModelOrder.strategy": "NODES_AND_EDGES",
    },
    children: [
      ...features.map((feature) => ({
        id: `lane:${feature}`,
        layoutOptions: { "elk.padding": lanePadding },
        children: flowMap.routes
          .filter((r) => r.feature === feature)
          .map((r) => {
            const card = cards.get(r.id)!;
            return { id: r.id, width: card.width, height: card.height };
          }),
      })),
      ...(hasChromeLane
        ? [
            {
              id: `lane:${CHROME_LANE}`,
              layoutOptions: { "elk.padding": lanePadding },
              children: [
                ...flowMap.chrome.map((c) => ({ id: c.source, ...CHROME_NODE_SIZE })),
                ...(flowMap.stageEntries.length > 0 ? [{ id: STAGE_NODE_ID, ...STAGE_NODE_SIZE }] : []),
              ],
            },
          ]
        : []),
    ],
    edges: [],
  };

  type PendingEdge = { id: string; source: string; target: string; data: TransitionEdgeData };
  const pendingEdges: PendingEdge[] = [];

  for (const route of flowMap.routes) {
    for (const t of route.transitions) {
      if (t.to === route.id) continue; // self-transitions become node badges
      pendingEdges.push({
        id: `${route.id}:${t.key}->${t.to}`,
        source: route.id,
        target: t.to,
        data: {
          transition: t,
          sourceLabel: route.id,
          targetScope: routeById.get(t.to)?.requiredScope ?? [],
          kind: "page",
        },
      });
    }
  }
  for (const chrome of flowMap.chrome) {
    for (const t of chrome.transitions) {
      pendingEdges.push({
        id: `${chrome.source}:${t.key}->${t.to}`,
        source: chrome.source,
        target: t.to,
        data: {
          transition: t,
          sourceLabel: chrome.label,
          targetScope: routeById.get(t.to)?.requiredScope ?? [],
          kind: "chrome",
        },
      });
    }
  }
  for (const entry of flowMap.stageEntries) {
    pendingEdges.push({
      id: `stage:${entry.stage}->${entry.to}`,
      source: STAGE_NODE_ID,
      target: entry.to,
      data: {
        transition: { key: entry.stage, to: entry.to, trigger: `App stage: ${entry.stage}` },
        sourceLabel: "App stages",
        targetScope: routeById.get(entry.to)?.requiredScope ?? [],
        kind: "stage",
      },
    });
  }

  // Stage edges are toggled off by default in the UI but participate in
  // layout so toggling never reshuffles positions.
  elkGraph.edges = pendingEdges.map((e) => ({ id: e.id, sources: [e.source], targets: [e.target] }));

  const layout = await elk.layout(elkGraph);

  const nodes: Node[] = [];
  for (const lane of layout.children ?? []) {
    const feature = lane.id.replace(/^lane:/, "");
    nodes.push({
      id: lane.id,
      type: "swimlane",
      position: { x: lane.x ?? 0, y: lane.y ?? 0 },
      data: { label: feature },
      width: lane.width,
      height: lane.height,
      selectable: false,
      draggable: false,
      zIndex: -1,
    });
    for (const child of lane.children ?? []) {
      const base = {
        id: child.id,
        parentId: lane.id,
        position: { x: child.x ?? 0, y: child.y ?? 0 },
        width: child.width,
        height: child.height,
      };
      if (child.id === STAGE_NODE_ID) {
        nodes.push({ ...base, type: "stage", data: { stageEntries: flowMap.stageEntries } });
      } else if (child.id.startsWith("chrome:")) {
        const chrome = flowMap.chrome.find((c) => c.source === child.id)!;
        nodes.push({ ...base, type: "chrome", data: { label: chrome.label, source: chrome.source } });
      } else {
        const route = routeById.get(child.id)!;
        nodes.push({
          ...base,
          type: "page",
          data: { route, card: cards.get(child.id)! } satisfies PageNodeData,
        });
      }
    }
  }

  const edges: Edge<TransitionEdgeData>[] = pendingEdges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    type: "transition",
    data: e.data,
    hidden: e.data.kind === "stage", // UI default; toggle flips this
    markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16, color: "#6366f1" },
  }));

  return { nodes, edges, features: hasChromeLane ? [...features, CHROME_LANE] : features };
}
