---
title: Overview
description: How @spock/router joins a route tree to a data tree, and what the type checker enforces.
---

`@spock/router` is a typed router for React apps. You define a route tree with data bindings, and the type checker
makes sure every page fits where it's placed. [React Router](https://reactrouter.com) matches URLs and keeps the
history underneath, but it isn't part of the API.

## Why it works this way

At the start of a project, an agent has the least context it will ever have. To keep moving, it makes quick calls: a
screen here, a field there, a shortcut to the data it needs. Once those calls are in the code, they look exactly like
decisions someone thought hard about.

The router separates an app's **outline** from its **colouring in**:

- **The outline** is which screens exist, how they nest, how you get between them, and which part of the domain each
  one is about. It's expensive to change later.
- **The colouring in** is what a screen renders and how it looks. It's cheap to throw away and redo.

The whole outline lives in a few files, and the type checker enforces it. A page can't reach data its route doesn't
give it, and a route can't bind to data its URL doesn't identify. When the outline doesn't support what you're
building, you get a type error. That error is a product question, and it shows up before any code is built on a
guess.

## Two trees

An app has two trees:

1. **The route tree** is navigation: the screens, how they nest, and their URLs. Routes are named by their key path,
   such as `org.project.settings`.
2. **The data tree** is the domain: a [valtio](https://valtio.dev) store shaped by entities, not URLs, such as
   `store.orgs[orgId].projects[projectId]`.

**Bindings** join them. A binding is a selector from a route's params to one node in the data tree. A route with a
binding is bound to that node, and a route without one inherits its nearest bound ancestor's node.

```ts
export const router = createRouter({
  component: RootLayout,
  data: () => store, // bound: the whole store
  children: {
    org: {
      path: "$orgId",
      component: OrgLayout,
      data: (p: { orgId: string }) => store.orgs[p.orgId], // bound: an org
      children: {
        members: { path: "members", component: Members }, // inherits the org
      },
    },
  },
});
```

## Components don't know where they are

A component never names its route. It calls `useData()` with no arguments and gets the node of the route that rendered
it. Its position in the tree decides what it sees.

Pages say what shape of node they need instead:

```tsx
const { page, useData } = node<Org>();

export const Members = page(function Members() {
  const org = useData();
  return <ul>{Object.values(org.members).map((m) => <li key={m.id}>{m.name}</li>)}</ul>;
});
```

Put `Members` on a route whose node isn't an `Org`, and it's a type error at that route's `component`.

## What's checked

| Mistake                                                    | Where it fails                  |
| ---------------------------------------------------------- | ------------------------------- |
| A binding needs a param its route's path doesn't give it   | The route's `data`              |
| A page needs a different node from the one its route has   | The route's `component`         |
| A page is placed on a route with no node                   | The route's `component`         |
| A link targets a route that doesn't exist                  | The link's `to`                 |
| A link passes a param its target doesn't have              | The link's `params`             |

Some things aren't checked yet. [What the types don't catch](/router/pages/#what-the-types-dont-catch) lists them.

## Next

- [The route tree](/router/routes/): names, paths, params and layouts.
- [Data](/router/data/): bindings, reading and writing.
- [Pages](/router/pages/): `node<T>()` and portable components.
- [Links](/router/links/): navigating by route name.
- [API reference](/router/reference/): every export.
