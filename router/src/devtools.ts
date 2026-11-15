// What dev tools (`@spock/toolbar`) can see of a router: its route tree, the
// current matches, and a way to navigate by route name. Not part of the app
// API; apps import from "@spock/router", never from here.
//
// Every router registers itself when it's created. It's a single module-level
// slot, so the toolbar gets the same router whether it loads before or after
// the app.
import { isNotFound, type AnyRouter } from "@tanstack/react-router";
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

export type DevRouter = {
  readonly routes: readonly DevRoute[];
  state(): DevRouterState;
  /** Calls `listener` after each navigation settles. Returns an unsubscribe. */
  subscribe(listener: () => void): () => void;
  navigate(name: string, params: Record<string, string>): void;
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
  };
  for (const watcher of watchers) watcher(current);
}

function readState(tanstack: AnyRouter): DevRouterState {
  const { location, matches } = tanstack.state;
  const devMatches: DevMatch[] = matches.map((match) => ({
    name: (match.staticData as RouteMeta).name,
    params: match.params as Record<string, string>,
    boundAt: (match.context as { data?: DataBinding } | undefined)?.data?.boundAt,
  }));
  const base = { pathname: location.pathname, search: location.searchStr };

  // TanStack flags the match that renders "not found", and leaves the ones
  // below it unloaded, so they're dropped.
  const shown = matches.findIndex((match) => match._notFound === true);
  if (shown === -1) return { ...base, matches: devMatches, notFound: undefined };
  const error = matches[shown]!.error;
  const missingAt = isNotFound(error) ? (error.data as MissingData | undefined)?.missingDataAt : undefined;
  if (missingAt === undefined) {
    return { ...base, matches: devMatches.slice(0, shown + 1), notFound: { reason: "url" } };
  }
  const failed = devMatches.findIndex((match) => match.name === missingAt);
  return {
    ...base,
    matches: failed === -1 ? devMatches : devMatches.slice(0, failed + 1),
    notFound: { reason: "data", route: missingAt },
  };
}
