---
title: Pages
description: Declaring the node shape a page needs with node<T>(), and what the tree checks.
---

A page is a route component. It renders with no props, and reads its data through hooks. It never names its route:
it says what shape of node it needs, and the route tree checks that each page is placed where that shape is
available.

## `node<T>()`

`node<T>()` returns hooks typed for a node of shape `T`, and `page`, which marks a component as needing one:

```tsx
import { Link, node, Outlet } from "@spock/router";
import type { Project } from "../data/store";

const { page, useData, useDataProxy } = node<Project>();

export const ProjectLayout = page(function ProjectLayout() {
  const project = useData();
  return (
    <>
      <h2>{project.name}</h2>
      <Outlet />
    </>
  );
});
```

Wrap every route `component` in `page(...)`. Placing a page on a route whose node doesn't fit `T` is a type error at
that route's `component`. So is placing it on a route with no node at all, since `useData()` would throw there.

`T` names a shape, never a route. A page that needs less than its route gives still fits: `node<{ name: string }>()`
fits on a project route, an org route, or anywhere else whose node has a `name`.

## Portable components

A portable component is used inside pages, rather than placed in the tree. It uses the same `node<T>()` hooks:

```tsx
/** Works under any route bound to a project. */
export function ProjectHeader() {
  const project = useData();
  return <h2>Project: {project.name}</h2>;
}
```

Nothing checks a portable component. It trusts that whichever page renders it sits on a route with a node of shape
`T`, so only use it under such routes.

## Which route rendered this?

`useRouteInfo()` returns the name of the route that rendered the component, and the route its node was bound at:

```tsx
const { name, boundAt } = useRouteInfo();
// On /acme/members: { name: "org.members", boundAt: "org" }
```

It's for debugging and dev UI. Don't branch on it in a page, since that puts route names back into components. The
[toolbar's Router app](/toolbar/apps/#router) shows the same thing for every matched route.

## What the types don't catch

- **`Link` params are partial.** A component doesn't know its route, so the types can't tell which params the current
  route will fill in. A missing param throws when the link renders. See [Links](/router/links/).
- **Portable components** aren't in the tree, so their `T` is trusted.
- **`notFound` components** get no node and aren't checked. Don't call `useData()` in one.
- **The generic `useData<T>()`** exported from `@spock/router` isn't checked either. Use the one from `node<T>()`.
- **Deleting or replacing records** isn't detected. The page just goes stale. See
  [Mutate records in place](/router/data/#mutate-records-in-place).
- **Params are plain strings.** A project id and a document id have the same type, so nothing stops you from mixing
  them up.
