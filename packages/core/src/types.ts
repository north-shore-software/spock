// Type-level view of a route tree: route names, params and data nodes are all
// computed from the tree literal passed to `createRouter`.
import type { ReactNode } from "react";

/** A route component: renders with no props; reads data and params through hooks. */
export type RouteComponent = () => ReactNode;

/** Picks a route's data node from its params. `undefined` means "not found". */
// oxlint-disable-next-line typescript/no-explicit-any -- any params type is allowed; `CheckTree` checks it.
export type Selector = (params: any) => object | undefined;

/** One route in the tree. Children are keyed by name. */
export type RouteDef = {
  /** Relative to the parent. `$name` segments are params; `"/"` is the index route. */
  path?: string;
  component?: RouteComponent;
  notFound?: RouteComponent;
  /**
   * Binds this route, and children without their own `data`, to a node.
   *
   * Runs on navigation: if it returns `undefined`, the route renders "not
   * found". Its result is re-selected at render time, so records must be
   * mutated in place, never deleted or replaced while viewing: a deletion
   * changes the parent, which the node's subscription doesn't see.
   */
  data?: Selector;
  children?: Record<string, RouteDef>;
};

/** The name of the root route. Other routes are named by their key path, e.g. `org.members`. */
export type RootName = "root";

type Segments<S extends string> = S extends `${infer Head}/${infer Rest}` ? Head | Segments<Rest> : S;
type ParamOf<Seg> = Seg extends `$${infer Name}` ? (Name extends "" ? never : Name) : never;
/** The param names a path introduces: `"projects/$projectId"` → `"projectId"`. */
export type PathParams<P> = P extends string ? ParamOf<Segments<P>> : never;

type NodeFrom<R, Inherited> = R extends { data: (params: never) => infer N } ? Exclude<N, undefined> : Inherited;

/** One flattened route: its name, all params from the root down, and its data node. */
type Entry<Name extends string, Params extends string, Node> = { name: Name; params: Params; node: Node };

type EntriesOf<R, Name extends string, Params extends string, Inherited> =
  | Entry<Name, Params, NodeFrom<R, Inherited>>
  | (R extends { children: infer C }
      ? ChildEntries<C, Name extends RootName ? "" : `${Name}.`, Params, NodeFrom<R, Inherited>>
      : never);

type ChildEntries<C, Prefix extends string, Params extends string, Inherited> = {
  [K in keyof C & string]: EntriesOf<C[K], `${Prefix}${K}`, Params | PathParams<C[K] extends { path: infer P } ? P : never>, Inherited>;
}[keyof C & string];

/** Every route in a tree, flattened. */
export type Entries<T> = EntriesOf<T, RootName, never, never>;

/**
 * The shape each route must satisfy, given the params its ancestors and its
 * own path provide. A `data` selector that needs a param the route doesn't
 * have fails here, at that route's `data` property.
 */
type CheckRoute<R, Params extends string> = {
  data?: (params: { [K in Params]: string }) => object | undefined;
} & (R extends { children: infer C } ? { children: CheckChildren<C, Params> } : unknown);

type CheckChildren<C, Params extends string> = {
  [K in keyof C]: CheckRoute<C[K], Params | PathParams<C[K] extends { path: infer P } ? P : never>>;
};

export type CheckTree<T> = CheckRoute<T, never>;
