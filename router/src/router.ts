// Builds a router from a route tree. React Router does the URL matching and
// the history; everything else (data bindings, "not found", rendering the
// nested routes) is spock's own, in resolve.ts and components.tsx. React
// Router's types and components aren't part of the API: apps see the tree's
// own types, from types.ts.
import type { NavigateFunction, RouteObject } from "react-router";
import { registerRouter } from "./devtools";
import { joinPaths, paramNames, toPattern } from "./paths";
import type { Resolution } from "./resolve";
import type { CheckTree, RouteDef } from "./types";

/**
 * Where a match gets its data node: its own route's binding, or the nearest
 * bound ancestor's. `boundAt` names the route it came from.
 */
export type DataBinding = { select: () => object; boundAt: string };

/** One route of the tree, flattened. */
export type RouteNode = {
  name: string;
  def: RouteDef;
  parent: RouteNode | undefined;
  /** Full path, e.g. `/$orgId/projects/$projectId`. A pathless layout has its parent's. */
  fullPath: string;
};

/** Marks the catch-all child added under each route with children; see `fallback`. */
export type RouteHandle = { fallback: true } | undefined;

/**
 * The router's live state: the page on screen, and React Router's `navigate`,
 * both set by `RouterProvider` once it has rendered. Dev tools read it.
 */
export type Session = {
  readonly resolution: Resolution | undefined;
  readonly navigate: NavigateFunction | undefined;
  readonly listeners: Set<() => void>;
  /** Called by `RouterProvider` after each page it renders. */
  publish(resolution: Resolution, navigate: NavigateFunction): void;
};

export type Router<T extends RouteDef = RouteDef> = {
  /** @internal React Router's route objects, for `matchRoutes`. Ids are route names. */
  readonly routes: RouteObject[];
  /** @internal Every route, by name. */
  readonly nodes: ReadonlyMap<string, RouteNode>;
  /** @internal Full path for each route name, used by `Link`. */
  readonly paths: ReadonlyMap<string, string>;
  /** @internal */
  readonly session: Session;
  /** Type-only: the tree this router was built from. */
  readonly tree?: T;
};

/**
 * Builds the router. Route names come from the tree keys (`org.members`);
 * params come from the paths; each route's data node is its own `data`
 * selector's result, or its nearest bound ancestor's.
 */
export function createRouter<const T extends RouteDef>(tree: T & CheckTree<T>): Router<T> {
  const nodes = new Map<string, RouteNode>();
  const rootNode: RouteNode = { name: "root", def: tree, parent: undefined, fullPath: "/" };
  nodes.set("root", rootNode);
  const routes: RouteObject[] = [
    // The root always gets a fallback, so every URL matches something.
    { id: "root", path: "/", children: [...childRoutes(rootNode, tree.children), fallback("root")] },
  ];
  const paths = new Map([...nodes].map(([name, node]) => [name, node.fullPath]));
  const session: Session = {
    resolution: undefined,
    navigate: undefined,
    listeners: new Set(),
    publish(resolution, navigate) {
      Object.assign(this, { resolution, navigate });
      for (const listener of this.listeners) listener();
    },
  };

  registerRouter(
    session,
    paths,
    [...nodes.values()].map((node) => ({
      name: node.name,
      // A pathless layout has no path of its own.
      path: node.name === "root" || node.def.path !== undefined ? node.fullPath : undefined,
      params: paramNames(node.fullPath),
      bound: node.def.data !== undefined,
      depth: node.name === "root" ? 0 : node.name.split(".").length,
    })),
  );
  return { routes, nodes, paths, session };

  function childRoutes(parent: RouteNode, children: Record<string, RouteDef> | undefined): RouteObject[] {
    if (!children) return [];
    return Object.entries(children).map(([key, def]): RouteObject => {
      const name = parent.name === "root" ? key : `${parent.name}.${key}`;
      const node: RouteNode = {
        name,
        def,
        parent,
        fullPath: def.path === undefined ? parent.fullPath : joinPaths(parent.fullPath, def.path),
      };
      nodes.set(name, node);
      const grandchildren = childRoutes(node, def.children);
      // `"/"` is the index route. With children of its own, it's a layout
      // that adds no segment, the same as one with no path.
      if (def.path === "/" && grandchildren.length === 0) return { id: name, index: true };
      const path = def.path === undefined || def.path === "/" ? undefined : toPattern(def.path);
      if (grandchildren.length === 0) return { id: name, path };
      return { id: name, path, children: [...grandchildren, fallback(name)] };
    });
  }
}

/**
 * A catch-all under `parent`. React Router ranks it below every real route,
 * so it only matches a URL that goes past `parent`'s children, and the deepest
 * one that matches says how far the URL got.
 */
function fallback(parent: string): RouteObject {
  return { id: `${parent}.*`, path: "*", handle: { fallback: true } satisfies RouteHandle };
}
