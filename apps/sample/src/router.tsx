// Builds the router from the route table in routes.ts. Each route is one
// createRoute call so TanStack can infer paths, params and context; the
// nesting here must match each entry's `parent`. Bound routes repeat
// `beforeLoad` after the spread (see `under` in @spock/core).
import { under } from "@spock/core";
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { routes } from "./routes";

const { root, org, orgHome, members, project, projectOverview, projectSettings } = routes;
const { document, shareLink } = routes;

export const rootRoute = createRootRoute({ ...root, beforeLoad: root.beforeLoad });

export const orgRoute = createRoute({ ...under(rootRoute, org), beforeLoad: org.beforeLoad });
export const orgHomeRoute = createRoute(under(orgRoute, orgHome));
export const membersRoute = createRoute(under(orgRoute, members));

export const projectRoute = createRoute({
  ...under(orgRoute, project),
  beforeLoad: project.beforeLoad,
});
export const projectOverviewRoute = createRoute(under(projectRoute, projectOverview));
export const projectSettingsRoute = createRoute(under(projectRoute, projectSettings));
const documentRoute = createRoute({
  ...under(projectRoute, document),
  beforeLoad: document.beforeLoad,
});

const shareLinkRoute = createRoute({
  ...under(rootRoute, shareLink),
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
