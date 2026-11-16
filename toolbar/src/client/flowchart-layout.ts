// Lays out the flow graph as a flowchart, with ELK's layered algorithm.
//
// - A screen is a box.
// - A route with children is a group around its children's boxes, like the
//   route tree's nesting.
// - A group whose component has links gets a small "links" node for them. A
//   layout's links are on every screen inside it, so one node with one arrow
//   per target stands in for an arrow from each of those screens.
// - Each arrow is one or more `<Link>`s between the same two nodes.
import ELK from "elkjs/lib/elk.bundled.js";
import type { FlowGraph, FlowRoute } from "@spock/router/flows/graph";

export type Point = { x: number; y: number };
export type Box = { id: string; route: string; x: number; y: number; width: number; height: number };

export type ScreenBox = Box & { kind: "screen"; path: string; entry: boolean };
export type NavBox = Box & { kind: "nav"; component: string };
export type GroupBox = Box & { kind: "group"; path: string | undefined; bound: boolean; depth: number };

export type FlowArrow = {
  id: string;
  /** A screen's or a links node's id. */
  from: string;
  /** A screen's id. */
  to: string;
  /** Indices into `FlowGraph.links`. */
  links: number[];
  points: Point[];
};

export type FlowLayout = {
  width: number;
  height: number;
  /** Outermost first, so they draw underneath. */
  groups: GroupBox[];
  screens: ScreenBox[];
  navs: NavBox[];
  arrows: FlowArrow[];
};

/** Text width in pixels, for sizing boxes to their labels. */
export type Measure = (text: string, font: "name" | "path" | "nav" | "group") => number;

export const screenId = (route: string) => `screen:${route}`;
export const navId = (route: string) => `nav:${route}`;
const groupId = (route: string) => `group:${route}`;

// Sizes. The flowchart component draws with the same numbers.
export const sizes = {
  screenPadX: 12,
  screenHeight: 46,
  entryTag: 44,
  navPadX: 10,
  navHeight: 26,
  groupHeader: 30,
  groupPad: 14,
};

type ElkInput = {
  id: string;
  width?: number;
  height?: number;
  children?: ElkInput[];
  edges?: { id: string; sources: string[]; targets: string[] }[];
  layoutOptions?: Record<string, string>;
};
type ElkOutput = {
  id: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  children?: ElkOutput[];
  edges?: { id: string; sections?: { startPoint: Point; endPoint: Point; bendPoints?: Point[] }[] }[];
};

const elk = new ELK();

export async function layoutFlows(graph: FlowGraph, measure: Measure): Promise<FlowLayout> {
  const routes = new Map(graph.routes.map((route) => [route.name, route]));
  const hasLinks = (route: string) =>
    graph.links.some((link) => link.shownBy.some((shown) => shown.route === route && shown.as === "component"));
  /** The node a route's component links come from. */
  const sourceOf = (route: FlowRoute) => (route.children.length > 0 ? navId(route.name) : screenId(route.name));

  // Arrows: one per (source node, landing screen), skipping a screen's links to itself.
  const arrows = new Map<string, Omit<FlowArrow, "points">>();
  graph.links.forEach((link, index) => {
    for (const shown of link.shownBy) {
      const route = routes.get(shown.route);
      if (shown.as !== "component" || !route) continue;
      for (const target of link.targets) {
        const lands = routes.get(target)?.landsOn;
        if (!lands) continue;
        const from = sourceOf(route);
        const to = screenId(lands);
        if (from === to) continue;
        const id = `${from}->${to}`;
        const arrow = arrows.get(id) ?? { id, from, to, links: [] };
        if (!arrow.links.includes(index)) arrow.links.push(index);
        arrows.set(id, arrow);
      }
    }
  });
  const reached = new Set([...arrows.values()].map((arrow) => arrow.to));

  const meta = new Map<string, Omit<ScreenBox, keyof Box> | Omit<NavBox, keyof Box> | Omit<GroupBox, keyof Box>>();
  const screenNode = (route: FlowRoute): ElkInput => {
    const entry = !reached.has(screenId(route.name));
    meta.set(screenId(route.name), { kind: "screen", path: route.path ?? "", entry });
    const name = measure(route.name, "name") + (entry ? sizes.entryTag : 0);
    const width = Math.max(name, measure(route.path ?? "", "path")) + 2 * sizes.screenPadX;
    return { id: screenId(route.name), width: Math.ceil(width), height: sizes.screenHeight };
  };
  const build = (route: FlowRoute, depth: number): ElkInput | undefined => {
    if (route.children.length === 0) return route.screen ? screenNode(route) : undefined;
    const children: ElkInput[] = [];
    if (hasLinks(route.name) && route.component?.component) {
      const component = route.component.component;
      meta.set(navId(route.name), { kind: "nav", component });
      children.push({
        id: navId(route.name),
        width: Math.ceil(measure(component, "nav") + 2 * sizes.navPadX),
        height: sizes.navHeight,
      });
    }
    if (route.screen) children.push(screenNode(route));
    for (const name of route.children) {
      const child = build(routes.get(name)!, depth + 1);
      if (child) children.push(child);
    }
    const ownPath = ownSegment(route, routes);
    meta.set(groupId(route.name), { kind: "group", path: ownPath, bound: route.bound, depth });
    const label = measure(route.name, "group") + (ownPath ? measure(ownPath, "path") + 8 : 0);
    return {
      id: groupId(route.name),
      children,
      layoutOptions: {
        "elk.padding": `[top=${sizes.groupHeader},left=${sizes.groupPad},bottom=${sizes.groupPad},right=${sizes.groupPad}]`,
        // Wide enough for the header, even around a narrow child.
        "elk.nodeSize.constraints": "MINIMUM_SIZE",
        "elk.nodeSize.minimum": `(${Math.ceil(label + 2 * sizes.groupPad)}, 0)`,
      },
    };
  };

  const root = graph.routes.find((route) => route.parent === undefined);
  const top = root && build(root, 0);
  // Arrows whose ends were dropped (e.g. a links node without a component name) can't be drawn.
  const drawable = [...arrows.values()].filter((arrow) => meta.has(arrow.from) && meta.has(arrow.to));
  const input: ElkInput = {
    id: "flows",
    layoutOptions: {
      "elk.algorithm": "layered",
      "elk.direction": "RIGHT",
      // Lays out across the groups, so arrows between them route well.
      "elk.hierarchyHandling": "INCLUDE_CHILDREN",
      "elk.edgeRouting": "ORTHOGONAL",
      "elk.spacing.nodeNode": "20",
      "elk.layered.spacing.nodeNodeBetweenLayers": "48",
      "elk.spacing.edgeNode": "16",
      "elk.layered.nodePlacement.strategy": "NETWORK_SIMPLEX",
      // Every coordinate in the result is absolute.
      "elk.json.shapeCoords": "ROOT",
      "elk.json.edgeCoords": "ROOT",
    },
    children: top ? [top] : [],
    edges: drawable.map(({ id, from, to }) => ({ id, sources: [from], targets: [to] })),
  };
  const output = (await elk.layout(input as never)) as unknown as ElkOutput;

  const layout: FlowLayout = {
    width: output.width ?? 0,
    height: output.height ?? 0,
    groups: [],
    screens: [],
    navs: [],
    arrows: [],
  };
  const collect = (node: ElkOutput) => {
    const info = meta.get(node.id);
    if (info) {
      const box: Box = {
        id: node.id,
        route: node.id.slice(node.id.indexOf(":") + 1),
        x: node.x ?? 0,
        y: node.y ?? 0,
        width: node.width ?? 0,
        height: node.height ?? 0,
      };
      if (info.kind === "screen") layout.screens.push({ ...box, ...info });
      else if (info.kind === "nav") layout.navs.push({ ...box, ...info });
      else layout.groups.push({ ...box, ...info });
    }
    node.children?.forEach(collect);
  };
  collect(output);

  const sections = new Map<string, Point[]>();
  const collectEdges = (node: ElkOutput) => {
    for (const edge of node.edges ?? []) {
      const section = edge.sections?.[0];
      if (section) sections.set(edge.id, [section.startPoint, ...(section.bendPoints ?? []), section.endPoint]);
    }
    node.children?.forEach(collectEdges);
  };
  collectEdges(output);
  for (const arrow of drawable) {
    const points = sections.get(arrow.id);
    if (points) layout.arrows.push({ ...arrow, points });
  }
  return layout;
}

/** What a route adds to its parent's path, e.g. `projects/$projectId`. */
function ownSegment(route: FlowRoute, routes: Map<string, FlowRoute>): string | undefined {
  if (route.path === undefined) return undefined;
  const parent = route.parent ? routes.get(route.parent) : undefined;
  let parentPath: string | undefined;
  for (let at = parent; at && parentPath === undefined; at = at.parent ? routes.get(at.parent) : undefined) {
    parentPath = at.path;
  }
  if (!parentPath || parentPath === "/") return route.path;
  return route.path.slice(parentPath.replace(/\/$/, "").length) || "/";
}
