import { useMatch } from "@tanstack/react-router";
import { useSnapshot } from "valtio";

/**
 * The live valtio proxy for the current route's data node. Use it for writes.
 *
 * `useMatch({ strict: false })` returns the match of the route that rendered
 * this component (the nearest match), with inherited context included. So a
 * layout gets its own node even while a deeper child route is showing.
 */
export function useDataProxy<T extends object>(): T {
  const data = useMatch({ strict: false, select: (m) => m.context.data });
  // The root route is bound, so this only happens outside the router.
  if (!data) throw new Error("useData: no data binding in route context");
  return data.select() as T;
}

/** A read-only, reactive snapshot of the current route's data node. */
export function useData<T extends object>(opts?: { sync?: boolean }) {
  return useSnapshot(useDataProxy<T>(), opts);
}
