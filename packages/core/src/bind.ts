import { notFound } from "@tanstack/react-router";

/**
 * What a binding puts into route context under the `data` key.
 *
 * It holds a selector, not the record: route context is computed when the
 * user navigates, not when the store changes, so a stored proxy could go
 * stale. `useData()` calls `select()` at render time.
 */
export type DataBinding<T> = { select: () => T };

/**
 * Builds a `beforeLoad` function that binds a route to one data-tree node.
 *
 * `select` picks the node from the route's params. If the node is missing at
 * navigation time we throw `notFound()`. If it disappears later, `select()`
 * throws an ordinary Error for the error boundary, but only on a re-render
 * that deletion itself won't trigger. Records must not be deleted or replaced
 * while viewing; see the rule in the sample app's store.ts.
 *
 * The returned function is generic (`Q extends P`) on purpose. With a
 * concrete `{ params: P }` parameter, `createRoute` infers its params type
 * from the binding instead of the path, so binding a route that lacks the
 * needed params would silently compile. Being generic leaves the route's
 * params path-derived, and a missing param becomes a type error.
 */
export function bind<P extends object, T extends object>(
  select: (params: P) => T | undefined,
) {
  return <Q extends P>({ params }: { params: Q }): { data: DataBinding<T> } => {
    if (!select(params)) throw notFound();
    return {
      data: {
        select: () => {
          const node = select(params);
          // Guard only; deletion is not supported (see the sample's store.ts).
          if (!node) throw new Error("Record removed while viewing");
          return node;
        },
      },
    };
  };
}
