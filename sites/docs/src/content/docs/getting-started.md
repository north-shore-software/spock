---
title: Getting started
description: Run the Spock template app, and start a new app from it.
---

Spock isn't published to npm yet. Its packages live in a pnpm workspace, and apps use them from there as TypeScript
source, with no build step. So for now, a Spock app lives inside the workspace too.

## Run the template

```sh
git clone https://github.com/north-shore-software/spock.git
cd spock
pnpm install
pnpm dev
```

`pnpm dev` starts the simple template (`templates/simple`), a React and Vite app with a route tree, a seeded store and
a few demo pages. The [dev toolbar](/toolbar/) appears at the bottom of the page.

## Start a new app

Copy the template to a new folder under `templates/`, and give it a new `name` in its `package.json`:

```sh
cp -r templates/simple templates/my-app
# edit templates/my-app/package.json: "name": "@spock/my-app"
pnpm install
pnpm --filter @spock/my-app dev
```

Then replace the template's outline with your own. The outline lives in three files:

| File                   | What it decides                                                       |
| ---------------------- | --------------------------------------------------------------------- |
| `src/router.ts`        | The screens, how they nest, their URLs, and the node each is bound to |
| `src/data/bindings.ts` | How a route's params pick a record                                    |
| `src/data/store.ts`    | The entities, their fields, and how they nest                         |

[The router overview](/router/) explains how they fit together.

## Working with a coding agent

The template has an `AGENTS.md` (and a `CLAUDE.md` that points to it). It tells an agent how the app is structured,
and to ask before it changes the outline. Keep it in your copy.
