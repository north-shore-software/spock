// The route tree. Every route is declared here, code-based (no file routes).
// Routes with `beforeLoad: b.x` are bound to a data node; routes without it
// inherit the nearest bound ancestor's node through route context.
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import * as b from "./data/bindings";
import { NotFound, RootLayout } from "./pages/root";
import { Members, OrgHome, OrgLayout } from "./pages/org";
import { ProjectLayout, ProjectOverview, ProjectSettings } from "./pages/project";
import { DocumentPage } from "./pages/document";

// root — bound: whole store
export const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  beforeLoad: b.root,
});

// org /$orgId — bound: org
export const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$orgId",
  component: OrgLayout,
  beforeLoad: b.org,
});

// org-home /$orgId/ — inherits org
export const orgHomeRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "/",
  component: OrgHome,
});

// members /$orgId/members — inherits org
export const membersRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "members",
  component: Members,
});

// project /$orgId/projects/$projectId — bound: project
export const projectRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "projects/$projectId",
  component: ProjectLayout,
  beforeLoad: b.project,
});

// project-overview …/ — inherits project
export const projectOverviewRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "/",
  component: ProjectOverview,
});

// project-settings …/settings — inherits project
export const projectSettingsRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "settings",
  component: ProjectSettings,
});

// document …/docs/$documentId — bound: document
const documentRoute = createRoute({
  getParentRoute: () => projectRoute,
  path: "docs/$documentId",
  component: DocumentPage,
  beforeLoad: b.document,
});

// share-link /d/$orgId/$projectId/$documentId — bound: document (many-to-one)
const shareLinkRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "d/$orgId/$projectId/$documentId",
  component: DocumentPage,
  beforeLoad: b.document,
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
