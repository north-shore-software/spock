// Type-level view of a route tree: route names, params and data nodes are all
// computed from the tree literal passed to `createRouter`.
import type { ReactNode } from "react";

/** A route component: renders with no props; reads its data through hooks. */
export type RouteComponent = () => ReactNode;

declare const needs: unique symbol;

/**
 * A route component that needs its route's node to have shape `N`. Made with
 * `node<N>().page(...)`; the tag exists only in types.
 *
 * The tag is a function taking `N`, so it's contravariant: a page that needs
 * less than its route gives (`Page<{ name: string }>` on a project route)
 * fits, and one that needs something else doesn't.
 */
export type Page<N extends object> = RouteComponent & { readonly [needs]?: (node: N) => void };

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
 * What a route's component must be, given its node. An unbound route (no
 * node) only takes untagged components, since a page there would throw.
 * `notFound` components aren't checked: they can render where the binding failed.
 */
type ComponentFor<Node> = [Node] extends [never]
  ? RouteComponent & { readonly [needs]?: undefined }
  : Node extends object
    ? Page<Node>
    : never;

/**
 * The shape each route must satisfy, given the params its ancestors and its
 * own path provide, and the node it inherits. A `data` selector that needs a
 * param the route doesn't have fails here, at that route's `data` property;
 * a page that needs a different node fails at its `component` property.
 */
type CheckRoute<R, Params extends string, Inherited> = {
  data?: (params: { [K in Params]: string }) => object | undefined;
  component?: ComponentFor<NodeFrom<R, Inherited>>;
} & (R extends { children: infer C } ? { children: CheckChildren<C, Params, NodeFrom<R, Inherited>> } : unknown);

type CheckChildren<C, Params extends string, Inherited> = {
  [K in keyof C]: CheckRoute<C[K], Params | PathParams<C[K] extends { path: infer P } ? P : never>, Inherited>;
};

export type CheckTree<T> = CheckRoute<T, never, never>;
