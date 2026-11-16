# AGENTS.md

This app is built on `@spock/router`. Read this before you change anything.

It isn't a style guide. It describes how the app is structured, and the rules are part of that structure. Follow
them. Don't modify, bypass or work around them, even when that looks quicker.

## Why the router works this way

At the start of a project, an agent has the least context it will ever have. To keep moving, it makes quick calls: a
screen here, a field there, a shortcut to the data it needs. Each call is reasonable at the time. But once it's in the
code, it looks exactly like a decision someone thought hard about, and the next session builds on it as if it were
one. The code is the context, and the context gets polluted.

Spock separates an app's **outline** from its **colouring in**:

- **The outline** is which screens exist, how they nest, how you get between them, and which part of the domain each
  one is about. It's expensive to change later, so it's the user's decision.
- **The colouring in** is what a screen renders and how it looks. It's cheap to throw away and redo, and it's where
  you should move fast.

The router keeps the whole outline in a few files and makes the type checker enforce it. A page can't reach data its
route doesn't give it. A route can't bind to data its URL doesn't identify. When the outline doesn't support what
you've been asked to build, you get a type error. That error is the point: it's a product question showing up before
any code gets built on a guess.

## The model

There are two trees:

1. **The route tree** (`src/router.ts`) is navigation: screens, how they nest, and their URLs. Routes are named by
   their key path, for example `org.project.settings`, and paths are relative to the parent.
2. **The data tree** (`src/data/store.ts`) is the domain, a valtio store shaped by entities, not URLs:
   `store.orgs[orgId].projects[projectId].documents[documentId]`.

**Bindings** (`src/data/bindings.ts`) join the two trees. A binding is a selector from a route's params to one node in
the data tree. A route with `data:` is bound to that node, and a route without it inherits the node of its nearest
bound ancestor. Several routes can share one binding: `document` and `shareLink` both bind to a document.

A component never says where it is. It calls `useData()` with no arguments and gets the node of the route that
rendered it, plus everything below that node. It can't see siblings, parents or the rest of the store. Its position in
the tree decides what it sees.

## The outline files

| File                          | What it decides                                                    |
| ----------------------------- | ------------------------------------------------------------------ |
| `src/router.ts`               | The screens, how they nest, their URLs, and the node each is bound to |
| `src/data/bindings.ts`        | How a route's params pick a record                                 |
| `src/data/store.ts` (types)   | The entities, their fields, and how they nest                      |

The seed values in `store.ts` aren't part of the outline, but its types are.

## Rules

### 1. Don't change the outline without asking

Before you change anything in the outline files, stop and ask the user. That includes:

- adding, removing, renaming or moving a route, or changing its path
- adding, removing or changing a `data:` binding, or changing which page a route renders
- adding, removing or renaming an entity or a field, or changing how entities nest

Ask even when the change seems obvious or small. Every line of the outline should be a decision the user made, so
that the next session can trust it.

When you ask, give:

- what you were asked to build, and why the current outline can't support it
- the change you'd make, as a short diff or a sketch of the tree
- any alternatives, and what each one means for the product

Then wait for an answer. Don't build on top of a change that hasn't been approved, and don't build a temporary
version "for now".

Anything outside the outline is yours to change: page bodies, portable components, styling and seed values.

### 2. Never work around a router type error

The router reports errors at a route's `data:` (the selector needs a param the route's path doesn't give it), at a
route's `component:` (the page needs a different node from the one the route has), and at `Link`'s `to` or `params`.
Each one means the code and the outline disagree. Don't make the error go away with:

- `as` casts, `any`, `@ts-ignore` or `@ts-expect-error`
- the generic `useData<T>()` from `@spock/router` in place of `node<T>()`, which isn't checked
- importing the store into a component
- reading route params, or importing `react-router`
- moving the code somewhere the tree doesn't check, such as a `notFound` component or a wrapper

Either the code is wrong, in which case fix the code, or the outline is wrong, in which case follow rule 1.

### 3. Components don't know where they are

- Don't put route names in components, except as a `Link` target.
- Don't put params, ids or store paths in components, except the ids a `Link` adds (rule 6).
- Don't import `store` outside `src/data/`.
- Don't import `react-router`. It runs underneath, but it isn't part of the API. Its `Link`, `useParams` and
  `useNavigate` skip the bindings and the tree checks.

### 4. Pages declare the shape they need

```tsx
const { page, useData, useDataProxy } = node<Project>();

export const ProjectOverview = page(function ProjectOverview() {
  const project = useData();
  // ...
});
```

- Wrap every route `component` in `page(...)` from `node<T>()`, where `T` is the shape of node the page reads. The
  tree then checks that the page fits the route it's placed on.
- `T` names a shape, never a route. A page that needs less than its route gives still fits. For example,
  `node<{ name: string }>()` fits on a project route.
- Portable components are used inside pages and aren't placed in the tree. They use the same `node<T>()` hooks, but
  nothing checks them: they trust that whichever page renders them sits on a route with a node of shape `T`. Only use
  them under such routes. `ProjectHeader` is an example.
- `notFound` components get no node, because they can render where a binding failed. Don't call `useData()` in one.

### 5. Read and write through the node

- `useData()` returns a read-only, reactive snapshot. Use `useData({ sync: true })` for controlled inputs, so the
  cursor doesn't jump.
- `useDataProxy()` returns the live proxy. To write, mutate it: `proxy.name = value`. oxlint's `react/immutability`
  rule flags this, and disabling it on that line, with a comment, is expected (see `src/pages/project.tsx`). That's
  the only sanctioned suppression.
- Mutate records in place. Adding a new record to a collection is fine. Never delete a record, or replace one with a
  new object (an org, project, document and so on), while the app is running. `useData()` subscribes to the node
  itself, so it doesn't see a change to the node's parent, and the page would keep showing a stale record. If a
  feature needs deletion or replacement, the router doesn't support it yet, so ask (rule 1).

### 6. Navigate with `Link`, by route name

```tsx
<Link to="org.project.settings">Settings</Link>
<Link to="org.project.document" params={{ documentId: d.id }}>{d.title}</Link>
```

- `to` is a route name, never a URL.
- Give only the params the current route doesn't already have. From a project page, the second link keeps the
  current `orgId` and `projectId` and adds `documentId`.
- Use `exact` on nav items that should be active only on that route, not on its children.
- There is no programmatic navigation, such as a redirect after a form submit. If you need it, ask (rule 1).

## Recipes

Each of these changes the outline, so get the user's approval first.

**A new screen showing an existing node.** Add a route under the right parent in `router.ts`, with a `path` and a
`component` but no `data:`, so it inherits the parent's node. Make the page with `node<T>()`, where `T` is that
node's type.

**A new screen for a new entity.**

1. Add the type to `store.ts`, nested under its parent entity as a `Record<string, T>` keyed by id.
2. Add a selector to `bindings.ts` that takes every param on the route's full path and walks down from the store with
   `?.`, returning `undefined` when a record is missing (the route then renders "not found").
3. Add the route to `router.ts` with a `$param` segment in its path and `data:` set to the new selector.
4. Make the page with `node<NewEntity>()`.

**A layout without a URL segment.** A route with no `path` is a pathless layout. Its children share its component
without adding a segment to their URLs.

## What the types don't catch

Rules 4, 5 and 6 cover these, but they're worth knowing as gaps:

- **`Link` params are partial.** A component doesn't know its route, so the types can't tell which params the
  current route will fill in. A missing param throws when the link renders: `Link to "...": missing params ...`.
- **Portable components and `notFound` components** aren't checked against the tree.
- **Deleting or replacing records** isn't detected. The page just goes stale.
- **Params are plain strings.** A project id and a document id have the same type, so nothing stops you from mixing
  them up.

## Checking your work

- Run `pnpm typecheck` in this directory. It must pass with no new casts or suppressions.
- Run `pnpm dev` and open every page you touched, including the links on it, because missing `Link` params only
  show up at render time.
- `useRouteInfo()` returns the route that rendered a component and the route its node was bound at. `NodeBox` shows
  both on every page.
