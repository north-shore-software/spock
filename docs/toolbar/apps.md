---
title: Apps
description: What the toolbar's Router, State and Settings apps show.
---

Click an app's button to open its window, and click it again or press <kbd>Esc</kbd> to close it. An app with
something to report shows a badge on its button.

## Router

Where you are, and how the router got there.

- **Location**: the current path and query string.
- **Matched routes**: each matched route, from the root down, with the params its path adds and where its data node
  came from. A node is either *bound here*, *from* an ancestor, *none*, or *missing* when the route's selector found
  nothing.
- **Route tree**: every route, with its path. Matched routes are highlighted, and routes with their own `data` are
  tagged. Click a route to go there. A route is only clickable when the current URL has every param it needs; hover
  one that isn't to see which params are missing.

### Not found

When the page is "not found", the Router app shows a badge and says why:

- **No route matches this URL.** The URL is wrong, or the route doesn't exist.
- **A route's data selector found nothing for these params.** The URL matched, but a record is missing. The matched
  routes stop at the route whose selector failed, and its node is marked *missing*.

## State

The data the current routes are bound to, as a live tree.

- **Bound nodes**: each matched route that's bound to its own node, outermost first, with the node's path in the
  store, such as `orgs.acme.projects.web`. The last one is tagged *this page*. Click one to show it in the tree.
- **Data**: the outermost bound node as a tree. When the root is bound to the whole store, that's the whole store.

The tree opens down to each bound node when you navigate, and tags each with the routes bound to it. The page's own
node is highlighted. Values flash when they change, so you can watch a write land. Opening and closing nodes yourself
is kept across changes.

Large objects show their first 200 entries, then "… _n_ more".

## Select element

Not an app, but a button next to Settings. Press it, then click anything on the page to copy what an agent needs to
find it in the source:

```
<h2>
  Project: Website
</h2>
  in ProjectHeader (at src/pages/project.tsx:10)
  in ProjectLayout (at src/pages/project.tsx:16)
  in OrgLayout (at src/pages/org.tsx:18)

Spock route: org.project.settings at /acme/projects/web/settings
  params: orgId=acme, projectId=web
  data (store paths): root → (root); org → orgs.acme; org.project → orgs.acme.projects.web
```

That's the element's HTML; the app's components that rendered it, innermost first, with the file and line of each;
and the current route, its params, and the store path of each bound route's node. Paths are relative to the app's
root, or absolute for files outside it, like workspace packages.

While you're picking, the element under the cursor is highlighted and labelled with its component, and clicks don't
reach the page. Press <kbd>Esc</kbd> or the button again to stop.

Finding components and source lines uses [React Grab](https://github.com/aidenybai/react-grab)'s primitives.

## Settings

| Setting           | What it does                                                                     |
| ----------------- | -------------------------------------------------------------------------------- |
| **Placement**     | Puts the bar at the bottom left, centre or right of the page.                    |
| **Notifications** | Shows a badge on an app when it has something to report.                         |
| **Hide toolbar**  | Tucks the bar off screen. Hover the bottom edge of the page to bring it back.    |

Settings are kept in `localStorage`, so they survive reloads.
