import {
  useMatch,
  type RegisteredRouter,
  type RouteById,
  type RouteIds,
} from "@tanstack/react-router";
import { useSnapshot } from "valtio";
import type { DataBinding } from "./bind";

/**
 * The live valtio proxy for the current route's data node. Use it for writes.
 *
 * `useMatch({ strict: false })` returns the match of the route that rendered
 * this component (the nearest match), with inherited context included. So a
 * layout gets its own node even while a deeper child route is showing.
 */
export function useDataProxy<T extends object>(): T {
  // The cast also pins the selected type. Without it, an app that hasn't
  // registered its router gets `any` here and useMatch returns the whole match.
  const data = useMatch({
    strict: false,
    select: (m) => m.context.data as DataBinding<T> | undefined,
  });
  // The root route is bound, so this only happens outside the router.
  if (!data) throw new Error("useData: no data binding in route context");
  return data.select();
}

/** A read-only, reactive snapshot of the current route's data node. */
export function useData<T extends object>(opts?: { sync?: boolean }) {
  return useSnapshot(useDataProxy<T>(), opts);
}

type RouteTree = RegisteredRouter["routeTree"];
type RouteId = RouteIds<RouteTree>;

/** A route object, or `getRouteApi(id)`: anything with a route id and `useRouteContext`. */
type RouteLike<TId extends RouteId> = { id: TId; useRouteContext: () => unknown };

/** The data-node type a route is bound to, read from its (inherited) context. */
export type NodeOf<TId extends RouteId> =
  RouteById<RouteTree, TId>["types"]["allContext"] extends { data: DataBinding<infer T extends object> }
    ? T
    : never;

/** Like `useDataProxy`, but typed from `route`. Use for writes. */
export function useDataProxyFor<TId extends RouteId>(route: RouteLike<TId>): NodeOf<TId> {
  // The one cast: inside the generic, TS can't see that this route's context
  // has a `data` binding. `NodeOf<TId>` resolves it at each call site.
  const { data } = route.useRouteContext() as { data: DataBinding<NodeOf<TId>> };
  return data.select();
}

/** Like `useData`, but typed from `route`: a snapshot of that route's node. */
export function useDataFor<TId extends RouteId>(route: RouteLike<TId>, opts?: { sync?: boolean }) {
  return useSnapshot(useDataProxyFor(route), opts);
}
