// Data and params hooks, addressed by route name. Types come from the app's registered router (see `Register`).
import { useMatch, useMatches } from "@tanstack/react-router";
import { useSnapshot, type Snapshot } from "valtio";
import type { DataBinding, RouteMeta, Router } from "./router";
import type { Entries } from "./types";

/**
 * Register the app's router to type route names, params and data:
 *
 *     declare module "@spock/core" {
 *       interface Register { router: typeof router }
 *     }
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- augmented by apps.
export interface Register {}

type Registered = Register extends { router: Router<infer T> } ? T : never;
type AllEntries = [Registered] extends [never]
  ? { name: string; params: string; node: object }
  : Entries<Registered>;
export type EntryOf<N> = Extract<AllEntries, { name: N }>;

/** Every route name, e.g. `"root" | "org" | "org.members"`. */
export type RouteName = AllEntries["name"];
/** All params of a route, its ancestors' included. */
export type ParamsOf<N extends RouteName> = { [K in EntryOf<N>["params"]]: string };
/** The data node a route is bound to, by its own `data` or inherited. */
export type NodeOf<N extends RouteName> = EntryOf<N>["node"];

type SnapshotOptions = { sync?: boolean };

const nameOf = (match: { staticData: unknown }) => (match.staticData as RouteMeta).name;

/** The active match for `name`, or the nearest match when `name` is omitted. */
function useRouteMatch(name: string | undefined, hook: string) {
  // Both hooks run unconditionally; `name` decides which result is used.
  const nearest = useMatch({ strict: false });
  const named = useMatches({
    select: (matches) => (name === undefined ? undefined : matches.find((m) => nameOf(m) === name)),
  });
  const match = name === undefined ? nearest : named;
  if (!match) throw new Error(`${hook}("${name}"): that route is not active`);
  return match;
}

function selectData(match: { context: unknown }, hook: string): object {
  const data = (match.context as { data?: DataBinding }).data;
  if (!data) throw new Error(`${hook}: no data is bound to this route or its ancestors`);
  return data.select();
}

/**
 * The live valtio proxy for a route's data node. Use it for writes.
 *
 * With a name, it's typed from that route. Without one, it reads the route
 * that rendered this component (a layout gets its own node even while a
 * child route is showing), and you supply the type: portable components.
 */
export function useDataProxy<N extends RouteName>(name: N): NodeOf<N>;
export function useDataProxy<T extends object>(): T;
export function useDataProxy(name?: string): object {
  return selectData(useRouteMatch(name, "useDataProxy"), "useDataProxy");
}

/** A read-only, reactive snapshot of a route's data node. Named or nearest, as `useDataProxy`. */
export function useData<N extends RouteName>(name: N, options?: SnapshotOptions): Snapshot<NodeOf<N>>;
export function useData<T extends object>(options?: SnapshotOptions): Snapshot<T>;
export function useData(nameOrOptions?: string | SnapshotOptions, options?: SnapshotOptions): object {
  const name = typeof nameOrOptions === "string" ? nameOrOptions : undefined;
  const opts = typeof nameOrOptions === "string" ? options : nameOrOptions;
  return useSnapshot(selectData(useRouteMatch(name, "useData"), "useData"), opts);
}

/** The params of an active route, its ancestors' included. */
export function useParams<N extends RouteName>(name: N): ParamsOf<N> {
  return useRouteMatch(name, "useParams").params as ParamsOf<N>;
}

/** The name of the route that rendered this component. */
export function useRouteName(): RouteName {
  return nameOf(useRouteMatch(undefined, "useRouteName")) as RouteName;
}
