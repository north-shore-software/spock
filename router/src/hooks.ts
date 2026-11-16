// Data hooks. They take no route name: a component reads the route that
// rendered it, so its position in the tree decides what it sees. Pages
// declare the node shape they need with `node<T>()`, and the route tree
// checks that each page is placed on a route whose node fits (see `Page`).
import { useSnapshot, type Snapshot } from "valtio";
import { useNearestMatch } from "./context";
import type { Router } from "./router";
import type { Entries, Page, RouteComponent } from "./types";

/**
 * Register the app's router to type route names, params and data:
 *
 *     declare module "@spock/router" {
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

function useSelectedData(hook: string): object {
  const data = useNearestMatch(hook).binding;
  if (!data) throw new Error(`${hook}: no data is bound to this route or its ancestors`);
  return data.select();
}

/** The live valtio proxy for this route's data node. Use it for writes. */
export function useDataProxy<T extends object>(): T {
  return useSelectedData("useDataProxy") as T;
}

/**
 * A read-only, reactive snapshot of this route's data node. Pass
 * `{ sync: true }` for inputs, so the caret doesn't jump.
 *
 * `T` is the shape the component needs, not where it lives: nothing checks
 * it at compile time. Pages should get these hooks from `node<T>()`, so the
 * route tree can check the shape.
 */
export function useData<T extends object>(options?: SnapshotOptions): Snapshot<T> {
  return useSnapshot(useSelectedData("useData") as T, options);
}

/**
 * Hooks for components that need a node of shape `T`, plus `page`, which
 * marks a route component as needing it. Name the shape, never the route:
 *
 *     const { page, useData } = node<Project>();
 *     export const ProjectLayout = page(function ProjectLayout() {
 *       const project = useData();
 *       ...
 *     });
 *
 * Placing a page on a route whose node doesn't fit `T` is a type error at
 * that route's `component`.
 */
export function node<T extends object>() {
  return {
    page: (component: RouteComponent): Page<T> => component,
    useData: useData<T>,
    useDataProxy: useDataProxy<T>,
  };
}

/** Which route rendered this component, and which route's binding it got its node from. */
export function useRouteInfo(): { name: RouteName; boundAt: RouteName | undefined } {
  const match = useNearestMatch("useRouteInfo");
  return {
    name: match.route.name as RouteName,
    boundAt: match.binding?.boundAt as RouteName | undefined,
  };
}
