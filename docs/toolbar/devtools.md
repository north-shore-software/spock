---
title: How it works
description: How the toolbar reads the router, through @spock/router/devtools.
---

The toolbar reads the router through a separate entry point, `@spock/router/devtools`. It's what dev tools can see of
a router: its route tree, the current matches, the data they're bound to, and a way to navigate by route name.

:::note
`@spock/router/devtools` isn't part of the app API. Apps import from `@spock/router`, never from here. Toolbar apps
are internal for now too: the toolbar's own apps are the only ones it can show.
:::

## Finding the router

Every router registers itself when `createRouter` runs. There's a single slot, so the toolbar gets the same router
whether its script loads before or after the app's.

```ts
import { watchRouter } from "@spock/router/devtools";

const stop = watchRouter((router) => {
  // Called now, and again whenever another router is created, such as after a hot reload.
  // `router` is undefined if the page has none.
});
```

## `DevRouter`

```ts
type DevRouter = {
  readonly routes: readonly DevRoute[];
  state(): DevRouterState;
  subscribe(listener: () => void): () => void;
  navigate(name: string, params: Record<string, string>): void;
  data(): DevData | undefined;
  subscribeData(listener: () => void): () => void;
};
```

| Member                    | What it does                                                                                        |
| ------------------------- | --------------------------------------------------------------------------------------------------- |
| `routes`                  | Every route, in definition order, parents before children.                                          |
| `state()`                 | The location, the matched routes, and why the page is "not found", if it is.                       |
| `subscribe(listener)`     | Calls `listener` after each navigation settles. Returns an unsubscribe.                             |
| `navigate(name, params)`  | Goes to a route by name. Throws for a pathless layout.                                              |
| `data()`                  | A snapshot of the outermost bound node, and where each bound node sits in it. `undefined` when no matched route is bound. |
| `subscribeData(listener)` | Calls `listener` after each change to the data under the outermost bound route. Navigating isn't a change; `subscribe` covers that. |

## Types

```ts
/** One route in the tree. */
type DevRoute = {
  name: string;
  /** Full path, e.g. `/$orgId/projects/$projectId`. Pathless layouts have none. */
  path: string | undefined;
  /** The `$name` params the full path needs. */
  params: string[];
  /** Has its own `data` selector, rather than inheriting one. */
  bound: boolean;
  depth: number;
};

type DevRouterState = {
  pathname: string;
  search: string;
  /** The matched routes, from the root down. On a not-found page, they stop where it failed. */
  matches: DevMatch[];
  notFound: DevNotFound | undefined;
};

type DevMatch = {
  name: string;
  params: Record<string, string>;
  /** The route whose binding this match got its node from. */
  boundAt: string | undefined;
};

type DevNotFound =
  /** No route matches the URL. */
  | { reason: "url" }
  /** The URL matched, but `route`'s `data` selector found no node. */
  | { reason: "data"; route: string };

type DevData = {
  /** The outermost bound route. */
  rootRoute: string;
  /** A snapshot of `rootRoute`'s node. */
  root: unknown;
  /** Each matched route bound to its own node, outermost first, with the node's path from `root`. */
  bound: { route: string; path: string[] | undefined }[];
};
```

A bound node's `path` is found by identity, so it's `undefined` if the node isn't inside `root`.
