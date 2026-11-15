// Builds the router from the route table in routes.ts. Each route is one
// create call with literal types so TanStack can infer paths, params and
// context; the nesting here must match each entry's `parent`.
import { opts } from "@spock/core";
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { routes } from "./routes";

// Bound routes repeat `beforeLoad` as an explicit property after the spread.
// Only a direct property is checked against the route's path params; through
// a spread, TanStack infers params from the binding instead, so binding a
// route that lacks a needed param would compile (see bind.ts in @spock/core).
const { root, org, orgHome, members, project, projectOverview, projectSettings } = routes;
const { document, shareLink } = routes;

export const rootRoute = createRootRoute({ ...root, beforeLoad: root.beforeLoad });

export const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...opts(org),
  beforeLoad: org.beforeLoad,
});
export const orgHomeRoute = createRoute({ getParentRoute: () => orgRoute, ...opts(orgHome) });
export const membersRoute = createRoute({ getParentRoute: () => orgRoute, ...opts(members) });

export const projectRoute = createRoute({
  getParentRoute: () => orgRoute,
  ...opts(project),
  beforeLoad: project.beforeLoad,
});
export const projectOverviewRoute = createRoute({
  getParentRoute: () => projectRoute,
  ...opts(projectOverview),
});
export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  ...opts(projectSettings),
});
const documentRoute = createRoute({
  getParentRoute: () => projectRoute,
  ...opts(document),
  beforeLoad: document.beforeLoad,
});

const shareLinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  ...opts(shareLink),
  beforeLoad: shareLink.beforeLoad,
});

const routeTree = rootRoute.addChildren([
  orgRoute.addChildren([
    orgHomeRoute,
    membersRoute,
    projectRoute.addChildren([projectOverviewRoute, projectSettingsRoute, documentRoute]),
  ]),
  shareLinkRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
