---
title: Data
description: Binding routes to nodes in the data tree, and reading and writing them from components.
---

The data tree is a [valtio](https://valtio.dev) store, shaped by the domain rather than by the URLs. Routes reach into
it through bindings.

## The store

```ts title="src/data/store.ts"
import { proxy } from "valtio";

export type Project = { id: string; name: string; documents: Record<string, Document> };
export type Org = { id: string; name: string; projects: Record<string, Project> };
export type Store = { orgs: Record<string, Org> };

export const store = proxy<Store>({ orgs: { /* ... */ } });
```

Nest each entity under its parent as a `Record<string, T>` keyed by id. Only bindings import the store; components
never do.

## Bindings

A binding is a selector from a route's params to one node in the data tree:

```ts title="src/data/bindings.ts"
import { store } from "./store";

export const root = () => store;
export const org = (p: { orgId: string }) => store.orgs[p.orgId];
export const project = (p: { orgId: string; projectId: string }) =>
  store.orgs[p.orgId]?.projects[p.projectId];
```

Attach one to a route with `data:`. The route is then bound to whatever the selector returns, and so are its children,
until one of them has its own `data:`.

- **It takes every param on the route's full path.** A selector that needs a param the route's path doesn't give it is
  a type error at that route's `data`.
- **It walks down from the store with `?.`.** When a record is missing, it returns `undefined`, and the route renders
  [not found](/router/routes/#not-found).
- **It only selects.** It doesn't fetch, validate or create anything.

A selector runs on every navigation, to decide whether the page is found. It runs again each time a component that
reads the node renders, so the component gets the current record, not the one that was there when it navigated.

## Reading

`useData()` returns a read-only, reactive snapshot of the route's node. The component re-renders when anything it read
changes.

```tsx
const { page, useData } = node<Project>();

export const ProjectOverview = page(function ProjectOverview() {
  const project = useData();
  return <h2>{project.name}</h2>;
});
```

Get `useData` from [`node<T>()`](/router/pages/), not straight from `@spock/router`, so the route tree can check the
shape.

## Writing

`useDataProxy()` returns the live proxy. To write, mutate it:

```tsx
const { page, useData, useDataProxy } = node<Project>();

export const ProjectSettings = page(function ProjectSettings() {
  const proxy = useDataProxy();
  const project = useData({ sync: true });
  return (
    <input
      value={project.name}
      onChange={(e) => {
        // oxlint-disable-next-line react/immutability
        proxy.name = e.target.value;
      }}
    />
  );
});
```

Read through the snapshot and write through the proxy. For controlled inputs, pass `{ sync: true }` to `useData`, so
the caret doesn't jump.

## Mutate records in place

Adding a new record to a collection is fine. Don't delete a record, or replace one with a new object, while the app is
running.

`useData()` subscribes to the node itself. Deleting or replacing a record changes its *parent*, such as
`project.documents`, and the node's subscription doesn't see that. The page keeps showing the old record. The router
only throws `Record removed while viewing` if something else happens to re-render it.

Lifting this rule would mean subscribing along the whole path from the store root, rather than to the node.
