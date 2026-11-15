---
title: Links
description: Navigating by route name with Link, and how params are filled in.
---

`Link` targets a route by name, never by URL:

```tsx
<Link to="org.project.settings">Settings</Link>
<Link to="org.project.document" params={{ documentId: d.id }}>{d.title}</Link>
```

## Params come from the current route

Give only the params the current route doesn't already have. From a project page, the second link above keeps the
current `orgId` and `projectId`, and adds `documentId`. That way a component only deals in the ids of the records it
lists, and never in the ids of where it is.

Params you give override the current route's. The root layout stays on screen inside an org, and its links pass each
org's `orgId`, which replaces the current one:

```tsx
const { page, useData } = node<Store>();

export const RootLayout = page(function RootLayout() {
  const store = useData(); // the root is bound to the whole store
  return (
    <nav>
      {Object.values(store.orgs).map((org) => (
        <Link key={org.id} to="org" params={{ orgId: org.id }}>{org.name}</Link>
      ))}
    </nav>
  );
});
```

## What's checked

- `to` must be a route name. A typo is a type error.
- `params` can only name params the target route has.
- A route with no params takes no `params` prop.

What isn't checked is whether every param will be filled in. A component doesn't know which route it's on, so the
types can't know which params the current route has, and `params` is `Partial`. If one is missing when the link
renders, it throws:

```
Link to "org.project.document": missing params documentId; the current route doesn't have them
```

So open every page you change in the browser, including the links on it.

## Active links

A link to the current route, or to one of its ancestors, is active: it gets the `active` class, `aria-current="page"`
and `data-status="active"`, so style it with any of those. Pass `exact` to make a link active only on its own route. It's what you want for an
index route in a nav bar:

```tsx
<nav>
  <Link to="org.project.overview" exact>Overview</Link>
  <Link to="org.project.settings">Settings</Link>
</nav>
```

## Programmatic navigation

There isn't any yet: no redirects and no `navigate()` after a form submit.
