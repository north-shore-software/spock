// Helpers for turning a route table into TanStack routes.

/**
 * Builds `createRoute` options for a route-table entry nested under `parent`:
 * adds `getParentRoute` and drops the table-only `parent` field.
 *
 *     createRoute(under(orgRoute, routes.members))
 *
 * This returns options rather than wrapping `createRoute`. Inside a generic
 * wrapper, TanStack can't check `beforeLoad` against the route's path params,
 * so a binding that needs a param the path lacks would compile.
 *
 * For the same reason, bound routes must repeat `beforeLoad` as a direct
 * property after the spread. Through the spread, TanStack infers params from
 * the binding instead of the path (see bind.ts):
 *
 *     createRoute({ ...under(rootRoute, routes.org), beforeLoad: routes.org.beforeLoad })
 */
export function under<TParent, T extends { parent: string }>(
  parent: TParent,
  entry: T,
): { getParentRoute: () => TParent } & Omit<T, "parent"> {
  const { parent: _, ...options } = entry;
  void _;
  return { getParentRoute: () => parent, ...options };
}
