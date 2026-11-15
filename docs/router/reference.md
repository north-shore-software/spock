---
title: API reference
description: Every export of @spock/router.
---

Everything here is exported from `@spock/router`. Dev tools use a separate entry point,
[`@spock/router/devtools`](/toolbar/devtools/), which apps shouldn't import.

## Router

### `createRouter(tree)`

```ts
function createRouter<const T extends RouteDef>(tree: T & CheckTree<T>): Router<T>;
```

Builds the router from a route tree. Route names come from the tree's keys, params from its paths, and each route's
node from its own `data` selector, or its nearest bound ancestor's. The tree is checked as a whole: see
[What's checked](/router/#whats-checked). See [The route tree](/router/routes/).

### `RouteDef`

One route in the tree.

```ts
type RouteDef = {
  path?: string;
  component?: RouteComponent;
  notFound?: RouteComponent;
  data?: (params) => object | undefined;
  children?: Record<string, RouteDef>;
};
```

### `Router`

What `createRouter` returns. Pass it to `RouterProvider`, and register its type with `Register`. Its properties are
internal.

### `Register`

An interface to augment with your router's type, so route names, params and nodes are typed everywhere:

```ts
declare module "@spock/router" {
  interface Register {
    router: typeof router;
  }
}
```

## Components

### `RouterProvider`

```tsx
<RouterProvider router={router} />
```

Renders the app. Put it at the root, once.

### `Link`

```tsx
<Link to="org.project.document" params={{ documentId: d.id }} exact className="...">...</Link>
```

| Prop        | Type                      | What it does                                                        |
| ----------- | ------------------------- | ------------------------------------------------------------------- |
| `to`        | `RouteName`               | The target route, by name.                                          |
| `params`    | `Partial<ParamsOf<to>>`   | Params to add to, or override, the current route's.                 |
| `exact`     | `boolean`                 | Active only on this exact route, not on its children.               |
| `className` | `string`                  |                                                                     |
| `children`  | `ReactNode`               |                                                                     |

Throws when it renders if the merged params are missing one the target needs. See [Links](/router/links/).

### `Outlet`

Renders the matched child route. Put one in every layout.

## Hooks

### `node<T>()`

```ts
function node<T extends object>(): {
  page: (component: RouteComponent) => Page<T>;
  useData: (options?: { sync?: boolean }) => Snapshot<T>;
  useDataProxy: () => T;
};
```

Hooks for a node of shape `T`, and `page`, which marks a route component as needing one. See [Pages](/router/pages/).

### `useData(options?)`

```ts
function useData<T extends object>(options?: { sync?: boolean }): Snapshot<T>;
```

A read-only, reactive snapshot of the node of the route that rendered this component. Pass `{ sync: true }` for
controlled inputs. Throws if no route above the component is bound.

Nothing checks `T` against the route. In pages and portable components, use the `useData` from `node<T>()` instead.

### `useDataProxy()`

```ts
function useDataProxy<T extends object>(): T;
```

The live valtio proxy for the route's node. Mutate it to write. Throws if no route above the component is bound. As
with `useData`, prefer the one from `node<T>()`.

### `useRouteInfo()`

```ts
function useRouteInfo(): { name: RouteName; boundAt: RouteName | undefined };
```

The route that rendered this component, and the route its node was bound at. `boundAt` is `undefined` when no route
above it is bound.

## Types

| Type              | What it is                                                                         |
| ----------------- | ---------------------------------------------------------------------------------- |
| `RouteName`       | Every route name in the registered tree, such as `"root" \| "org" \| "org.members"`. |
| `ParamsOf<N>`     | All params of route `N`, its ancestors' included, as `string`s.                    |
| `NodeOf<N>`       | The node route `N` is bound to, by its own `data` or inherited.                    |
| `RouteComponent`  | A component that renders with no props: `() => ReactNode`.                         |
| `Page<T>`         | A route component that needs a node of shape `T`. Made with `node<T>().page`.      |
| `LinkProps<N>`    | `Link`'s props, for a link to route `N`.                                           |
