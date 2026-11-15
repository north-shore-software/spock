// What dev tools (`@spock/toolbar`) can see of a router: its route tree, the
// current matches, the data they're bound to, and a way to navigate by route
// name. Not part of the app API; apps import from "@spock/router", never from
// here.
//
// Every router registers itself when it's created. It's a single module-level
// slot, so the toolbar gets the same router whether it loads before or after
// the app.
import { isNotFound, type AnyRouter } from "@tanstack/react-router";
import { getVersion, snapshot, subscribe } from "valtio";
import type { DataBinding, MissingData, RouteMeta } from "./router";

/** One route in the tree, in definition order, parents before children. */
export type DevRoute = {
  name: string;
  /** Full path, e.g. `/$orgId/projects/$projectId`. Pathless layouts have none. */
  path: string | undefined;
  /** The `$name` params the full path needs. */
  params: string[];
  /** Has its own `data` selector, rather than inheriting one. */
  bound: boolean;
  depth: number;
};

/** One matched route, from the root down. */
export type DevMatch = {
  name: string;
  params: Record<string, string>;
  /** The route whose binding this match got its node from. */
  boundAt: string | undefined;
};

/** Why the page is "not found". */
export type DevNotFound =
  /** No route matches the URL. */
  | { reason: "url" }
  /** The URL matched, but `route`'s `data` selector found no node. */
  | { reason: "data"; route: string };

export type DevRouterState = {
  pathname: string;
  search: string;
  /**
   * The matched routes, from the root down. On a not-found page, they stop
   * at the route whose data is missing, or at the route showing "not found".
   */
  matches: DevMatch[];
  notFound: DevNotFound | undefined;
};

/** The data the matched routes are bound to. */
export type DevData = {
  /** The outermost bound route; the whole store, when it's the root. */
  rootRoute: string;
  /** A snapshot of `rootRoute`'s node. */
  root: unknown;
  /**
   * Each matched route bound to its own node, outermost first, with the
   * node's path from `root`, e.g. `["orgs", "acme"]`. The path is `undefined`
   * if the node isn't inside `root`.
   */
  bound: { route: string; path: string[] | undefined }[];
};

export type DevRouter = {
  readonly routes: readonly DevRoute[];
  state(): DevRouterState;
  /** Calls `listener` after each navigation settles. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  navigate(name: string, params: Record<string, string>): void;
  /** `undefined` when no matched route is bound. */
  data(): DevData | undefined;
  /**
   * Calls `listener` after each change to the data under the outermost bound
   * route. Navigating isn't a change; `subscribe` covers that. Returns an
   * unsubscribe.
   */
  subscribeData(listener: () => void): () => void;
};

let current: DevRouter | undefined;
const watchers = new Set<(router: DevRouter | undefined) => void>();

/**
 * Calls `watcher` with the current router now, and again whenever another one
 * is created, e.g. after a hot reload. Returns an unsubscribe.
 */
export function watchRouter(watcher: (router: DevRouter | undefined) => void): () => void {
  watchers.add(watcher);
  watcher(current);
  return () => watchers.delete(watcher);
}

/** @internal Called by `createRouter`. */
export function registerRouter(tanstack: AnyRouter, routes: DevRoute[]): void {
  const paths = new Map(routes.map((route) => [route.name, route.path]));
  current = {
    routes,
    state: () => readState(tanstack),
    subscribe(listener) {
      const offs = [tanstack.subscribe("onResolved", listener), tanstack.subscribe("onRendered", listener)];
      return () => offs.forEach((off) => off());
    },
    navigate(name, params) {
      const path = paths.get(name);
      if (path === undefined) throw new Error(`navigate: route "${name}" has no path`);
      void tanstack.navigate({ to: path, params });
    },
    data: () => readData(tanstack),
    subscribeData: (listener) => subscribeData(tanstack, listener),
  };
  for (const watcher of watchers) watcher(current);
}

type Match = AnyRouter["state"]["matches"][number];

const nameOf = (match: Match) => (match.staticData as RouteMeta).name;
const bindingOf = (match: Match) => (match.context as { data?: DataBinding } | undefined)?.data;

/**
 * The matches that rendered, and why the page is "not found", if it is.
 * TanStack flags the match that renders "not found", and leaves the ones below
 * it unloaded, so they're dropped.
 */
function resolve(tanstack: AnyRouter): { matches: Match[]; notFound: DevNotFound | undefined } {
  const { matches } = tanstack.state;
  const shown = matches.findIndex((match) => match._notFound === true);
  if (shown === -1) return { matches, notFound: undefined };
  const error = matches[shown]!.error;
  const missingAt = isNotFound(error) ? (error.data as MissingData | undefined)?.missingDataAt : undefined;
  if (missingAt === undefined) return { matches: matches.slice(0, shown + 1), notFound: { reason: "url" } };
  const failed = matches.findIndex((match) => nameOf(match) === missingAt);
  return {
    matches: failed === -1 ? matches : matches.slice(0, failed + 1),
    notFound: { reason: "data", route: missingAt },
  };
}

function readState(tanstack: AnyRouter): DevRouterState {
  const { location } = tanstack.state;
  const { matches, notFound } = resolve(tanstack);
  return {
    pathname: location.pathname,
    search: location.searchStr,
    matches: matches.map((match) => ({
      name: nameOf(match),
      params: match.params as Record<string, string>,
      boundAt: bindingOf(match)?.boundAt,
    })),
    notFound,
  };
}

/** Each match bound to its own node, outermost first, with the node itself. */
function boundNodes(tanstack: AnyRouter): { route: string; node: object }[] {
  const nodes: { route: string; node: object }[] = [];
  for (const match of resolve(tanstack).matches) {
    const binding = bindingOf(match);
    // A failed binding leaves its parent's in the context, so this skips it.
    if (binding?.boundAt !== nameOf(match)) continue;
    try {
      nodes.push({ route: binding.boundAt, node: binding.select() });
    } catch {
      // Removed while viewing; the page shows that error itself.
    }
  }
  return nodes;
}

const isProxy = (value: object) => getVersion(value) !== undefined;

function readData(tanstack: AnyRouter): DevData | undefined {
  const nodes = boundNodes(tanstack);
  const root = nodes[0];
  if (!root) return undefined;
  return {
    rootRoute: root.route,
    root: isProxy(root.node) ? snapshot(root.node) : root.node,
    bound: nodes.map(({ route, node }) => ({ route, path: pathTo(root.node, node, new Set()) })),
  };
}

/** The keys from `from` down to `target`, compared by identity. */
function pathTo(from: object, target: object, seen: Set<object>): string[] | undefined {
  if (from === target) return [];
  if (seen.has(from)) return undefined;
  seen.add(from);
  for (const [key, value] of Object.entries(from)) {
    if (typeof value !== "object" || value === null) continue;
    const rest = pathTo(value, target, seen);
    if (rest) return [key, ...rest];
  }
  return undefined;
}

/**
 * Subscribes to the outermost bound node, and moves the subscription when a
 * navigation changes which node that is.
 */
function subscribeData(tanstack: AnyRouter, listener: () => void): () => void {
  let watched: object | undefined;
  let unwatch: (() => void) | undefined;
  function watchRoot() {
    const root = boundNodes(tanstack)[0]?.node;
    if (root === watched) return;
    unwatch?.();
    watched = root;
    unwatch = root && isProxy(root) ? subscribe(root, listener) : undefined;
  }
  watchRoot();
  const offNavigate = tanstack.subscribe("onResolved", watchRoot);
  return () => {
    offNavigate();
    unwatch?.();
  };
}
