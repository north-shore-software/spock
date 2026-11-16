// The flow graph's shape. Separate from index.ts, which needs Node and
// TypeScript, so the toolbar's browser code can import the types.

/** Where something is written. `file` is relative to the tsconfig's directory. */
export type SourceRef = { file: string; line: number; component?: string };

export type FlowRoute = {
  name: string;
  /** Full path, e.g. `/$orgId/projects/$projectId`. Pathless layouts have none. */
  path: string | undefined;
  params: string[];
  /** Has its own `data` selector. */
  bound: boolean;
  parent: string | undefined;
  children: string[];
  /**
   * Can be the deepest match, i.e. a page you can be on. A route with an index
   * child isn't one: its URL lands on the index child.
   */
  screen: boolean;
  /** The screen a link to this route lands on. */
  landsOn: string | undefined;
  /** The route's `component`, when it's a component declared in the app. */
  component: SourceRef | undefined;
};

/** One `<Link>` in the source. */
export type FlowLink = {
  at: SourceRef;
  /** The route names `to` can be, as written. */
  targets: string[];
  /** The keys of `params`, when it's an object literal. */
  params: string[] | undefined;
  /**
   * The routes whose component renders this link, directly or through other
   * components, and whether it's their `component` or their `notFound`. A
   * route's component is shown on every screen below it.
   */
  shownBy: { route: string; as: "component" | "notFound" }[];
};

/** Screen `from` has links that land on screen `to`. Not-found pages have no edges. */
export type FlowEdge = { from: string; to: string; links: number[] };

export type FlowProblem = {
  kind:
    | "no-router" // no `createRouter` call in the app
    | "tree" // part of the route tree isn't written out, so it can't be read
    | "dynamic-link" // a Link's `to` isn't a string literal, or a choice between them
    | "unplaced-link" // a Link in a component that no route renders
    | "raw-anchor"; // an `<a href>` that may navigate inside the app
  message: string;
  at: SourceRef;
};

export type FlowGraph = {
  routes: FlowRoute[];
  links: FlowLink[];
  edges: FlowEdge[];
  problems: FlowProblem[];
};
