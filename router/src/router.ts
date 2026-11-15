// Builds a TanStack router from a route tree. TanStack is an implementation
// detail: its types are bypassed (routes are built in a loop, so it can't
// infer them), and the tree's own types in types.ts are what apps see.
import {
  createRootRoute,
  createRoute,
  createRouter as createTanStackRouter,
  notFound,
  type AnyRoute,
  type AnyRouter,
} from "@tanstack/react-router";
import { registerRouter } from "./devtools";
import { paramNames } from "./paths";
import type { CheckTree, RouteDef, Selector } from "./types";

/**
 * What a bound route puts into TanStack's route context under `data`.
 * Unbound children inherit it, so `boundAt` names the route it came from.
 */
export type DataBinding = { select: () => object; boundAt: string };

/** Stored in each TanStack route's `staticData`, so matches can be named. */
export type RouteMeta = { name: string };

/**
 * The `data` of the not-found error a bound route throws when its selector
 * finds nothing. TanStack hands the error to the nearest route with a
 * `notFound` component, so this records which route's selector it was.
 */
export type MissingData = { missingDataAt: string };

export type Router<T extends RouteDef = RouteDef> = {
  /** @internal */
  readonly tanstack: AnyRouter;
  /** @internal Full TanStack path for each route name, used by `Link`. */
  readonly paths: ReadonlyMap<string, string>;
  /** Type-only: the tree this router was built from. */
  readonly tree?: T;
};

/**
 * Builds the router. Route names come from the tree keys (`org.members`);
 * params come from the paths; each route's data node is its own `data`
 * selector's result, or its nearest bound ancestor's.
 */
export function createRouter<const T extends RouteDef>(tree: T & CheckTree<T>): Router<T> {
  const named: [string, AnyRoute, RouteDef][] = [];
  const root = createRootRoute({
    component: tree.component,
    notFoundComponent: tree.notFound,
    beforeLoad: tree.data && bindData(tree.data, "root"),
    staticData: { name: "root" } satisfies RouteMeta,
  });
  named.push(["root", root, tree]);
  addChildren(root, tree.children, "");
  const tanstack = createTanStackRouter({ routeTree: root });
  // TanStack computes each route's fullPath when the router is created.
  const paths = new Map(named.map(([name, route]) => [name, route.fullPath as string]));
  registerRouter(
    tanstack,
    named.map(([name, route, def]) => {
      // A pathless layout's fullPath is its parent's, so it has none of its own.
      const path = name === "root" || def.path !== undefined ? (route.fullPath as string) : undefined;
      return {
        name,
        path,
        params: paramNames(route.fullPath as string),
        bound: def.data !== undefined,
        depth: name === "root" ? 0 : name.split(".").length,
      };
    }),
  );
  return { tanstack, paths };

  function addChildren(parent: AnyRoute, children: Record<string, RouteDef> | undefined, prefix: string) {
    if (!children) return;
    parent.addChildren(
      Object.entries(children).map(([key, def]) => {
        const name = prefix + key;
        const route = createRoute({
          getParentRoute: () => parent,
          // Without a path it's a pathless layout, identified by its name.
          ...(def.path === undefined ? { id: name } : { path: def.path }),
          component: def.component,
          notFoundComponent: def.notFound,
          beforeLoad: def.data && bindData(def.data, name),
          staticData: { name } satisfies RouteMeta,
        });
        named.push([name, route, def]);
        addChildren(route, def.children, `${name}.`);
        return route;
      }),
    );
  }
}

/**
 * The `beforeLoad` for a bound route. It stores a selector, not the record:
 * route context is computed on navigation, not when the store changes, so a
 * stored proxy could go stale. The hooks call `select()` at render time.
 */
function bindData(select: Selector, boundAt: string) {
  return ({ params }: { params: object }): { data: DataBinding } => {
    if (!select(params)) throw notFound({ data: { missingDataAt: boundAt } satisfies MissingData });
    return {
      data: {
        boundAt,
        select: () => {
          const node = select(params);
          // Guard only; deletion is not supported (see `RouteDef.data`).
          if (!node) throw new Error("Record removed while viewing");
          return node;
        },
      },
    };
  };
}
