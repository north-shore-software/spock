---
title: The route tree
description: Defining routes with createRouter, and how they get their names, paths and params.
sidebar:
  order: 1
---

The route tree is one object literal passed to `createRouter`. It's the app's navigation: which screens exist, how
they nest, and their URLs.

```ts title="src/router.ts"
import { createRouter } from "@spock/router";
import * as b from "./data/bindings";

export const router = createRouter({
  component: RootLayout,
  notFound: NotFound,
  data: b.root,
  children: {
    org: {
      path: "$orgId",
      component: OrgLayout,
      data: b.org,
      children: {
        home: { path: "/", component: OrgHome },
        members: { path: "members", component: Members },
        project: {
          path: "projects/$projectId",
          component: ProjectLayout,
          data: b.project,
          children: {
            overview: { path: "/", component: ProjectOverview },
            settings: { path: "settings", component: ProjectSettings },
            document: { path: "docs/$documentId", component: DocumentPage, data: b.document },
          },
        },
      },
    },
    shareLink: { path: "d/$orgId/$projectId/$documentId", component: DocumentPage, data: b.document },
  },
});

declare module "@spock/router" {
  interface Register {
    router: typeof router;
  }
}
```

The `declare module` block registers the router with the types, so route names, params and nodes are checked
everywhere else in the app. Without it, they're all plain `string`s and `object`s.

Render the router with `RouterProvider`:

```tsx title="src/main.tsx"
import { RouterProvider } from "@spock/router";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(<RouterProvider router={router} />);
```

## Route options

Each route, the root included, can have:

| Option      | What it does                                                                                    |
| ----------- | ----------------------------------------------------------------------------------------------- |
| `path`      | The route's URL, relative to its parent. Leave it out for a [pathless layout](#pathless-layouts). |
| `component` | What the route renders. A layout renders its children with `<Outlet />`.                         |
| `notFound`  | What to render when this route, or a child, is "not found".                                     |
| `data`      | Binds the route to a node in the data tree. See [Data](/router/data/).                          |
| `children`  | Child routes, keyed by name.                                                                    |

## Names

A route is named by its key path from the root: `org`, `org.members`, `org.project.document`. The root is named
`root`. Names are what [`Link`](/router/links/) targets, and they're the only place a component refers to a route.

## Paths and params

Paths are relative to the parent, so `org.project.document` is at `/$orgId/projects/$projectId/docs/$documentId`. A
segment starting with `$` is a param. A route has its own params and all of its ancestors'.

A path of `"/"` is the parent's index route: it renders when the URL is exactly the parent's. `org.home` above is at
`/$orgId/`.

## Pathless layouts

A route with no `path` adds no URL segment. Its children are matched as if they were its parent's, and render inside
its component. Use one to share a layout between some of a route's children and not others.

```ts
children: {
  // Both at /$orgId/..., both rendered inside SettingsLayout.
  settingsArea: {
    component: SettingsLayout,
    children: {
      billing: { path: "billing", component: Billing },
      security: { path: "security", component: Security },
    },
  },
}
```

## Not found

A page is "not found" when no route matches the URL, or when a route's `data` selector returns `undefined`. Either
way, the nearest route with a `notFound` component renders it. A `notFound` component gets no node, so don't call
`useData()` in one.

## Many routes, one binding

Several routes can bind to the same kind of node. Above, `org.project.document` and `shareLink` both use `b.document`
and render the same `DocumentPage`. The page doesn't know or care which route it's on.
