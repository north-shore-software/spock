---
title: Overview
description: Add the spock dev toolbar to an app with its Vite plugin.
---

`@spock/toolbar` is a dev toolbar for Spock apps, modelled on [Astro's](https://docs.astro.build/en/guides/dev-toolbar/).
In dev, a bar of apps appears at the bottom of the page:

- **[Router](/toolbar/apps/#router)** shows where you are, which routes matched and where each got its data node, and
  the route tree. Click a route to go there.
- **[State](/toolbar/apps/#state)** shows the store as a live tree, opened down to the nodes the current routes are
  bound to.
- **[Settings](/toolbar/apps/#settings)** moves or hides the bar.
- **[Select element](/toolbar/apps/#select-element)** copies an element's component, source and route, for an agent.

## Setup

Add it as a dev dependency:

```json title="package.json"
{
  "devDependencies": {
    "@spock/toolbar": "workspace:*"
  }
}
```

Then add `spockToolbar()` to your Vite plugins:

```ts title="vite.config.ts" ins={1,6}
import { spockToolbar } from "@spock/toolbar";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), spockToolbar()],
});
```

That's all. There's nothing to import or render in the app: the toolbar finds the router on its own.

## Dev only

The plugin only runs under `vite dev`. It adds the toolbar's script to the page's HTML, so `vite build` output has no
toolbar and no toolbar code.

The script loads straight from the toolbar package's source. Vite only serves files inside the workspace by default,
so if your app lives outside the workspace, add the package to
[`server.fs.allow`](https://vite.dev/config/server-options#server-fs-allow).

## When the app breaks

The toolbar is its own React root in a shadow root, separate from the app's. The page's styles can't reach it, and it
keeps working when the app's render throws, so you can still see which route failed and what data it had. It uses the
app's copy of React, so it adds nothing to the page.
