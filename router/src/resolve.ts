// Turns a URL into the page to render: which routes matched, the data node
// each one reads, and where "not found" shows, if it does. Synchronous, and
// needs no React, so anything can run it: the app, dev tools, tests, scripts.
import { matchRoutes } from "react-router";
import type { DataBinding, RouteHandle, RouteNode, Router } from "./router";
import type { RouteComponent } from "./types";

/** One matched route. */
export type Match = {
  route: RouteNode;
  /** All the URL's params, not just this route's. */
  params: Record<string, string>;
  /** Its own binding, or the nearest bound ancestor's; `undefined` if none. */
  binding: DataBinding | undefined;
};

export type NotFound = {
  /** Shown in the outlet of the last rendered match, or alone if none rendered. */
  component: RouteComponent;
} & (
  | { reason: "url" }
  /** `route`'s selector found nothing. Its binding is still its parent's. */
  | { reason: "data"; route: Match }
);

export type Resolution = {
  pathname: string;
  search: string;
  /** The routes that render, from the root down. */
  matches: Match[];
  notFound: NotFound | undefined;
};

/**
 * Matches `location` and runs the data selectors down the matched routes.
 * Rendering stops at the first route whose selector finds nothing, or where
 * the URL stops matching, and the nearest `notFound` shows there.
 */
export function resolve(router: Router, location: { pathname: string; search?: string }): Resolution {
  const { pathname, search = "" } = location;
  const matches: Match[] = [];
  let binding: DataBinding | undefined;
  for (const found of matchRoutes(router.routes, pathname) ?? []) {
    const params = withoutSplat(found.params);
    if ((found.route.handle as RouteHandle)?.fallback) {
      return { pathname, search, matches, notFound: { reason: "url", component: notFoundFor(matches.at(-1)?.route) } };
    }
    const route = router.nodes.get(found.route.id!)!;
    const select = route.def.data;
    if (select) {
      if (!select(params)) {
        const notFound = { reason: "data", route: { route, params, binding }, component: notFoundFor(route) } as const;
        return { pathname, search, matches, notFound };
      }
      binding = {
        boundAt: route.name,
        select: () => {
          const node = select(params);
          // Guard only; deletion is not supported (see `RouteDef.data`).
          if (!node) throw new Error("Record removed while viewing");
          return node;
        },
      };
    }
    matches.push({ route, params, binding });
  }
  return { pathname, search, matches, notFound: undefined };
}

/** The `notFound` component of `route` or its nearest ancestor that has one. */
function notFoundFor(route: RouteNode | undefined): RouteComponent {
  for (let at = route; at; at = at.parent) if (at.def.notFound) return at.def.notFound;
  return DefaultNotFound;
}

function DefaultNotFound() {
  return "Not found";
}

/** Drops the `*` param a fallback route adds. */
function withoutSplat(params: Record<string, string | undefined>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(params)) if (name !== "*" && value !== undefined) result[name] = value;
  return result;
}
