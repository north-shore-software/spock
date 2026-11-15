// The route table. Every route is declared here as data; router.tsx turns
// each entry into a route with a one-line create call.
// Entries with `beforeLoad: b.x` are bound to a data node; entries without it
// inherit the nearest bound ancestor's node through route context.
// `parent` documents the nesting. router.tsx wires it by hand (getParentRoute
// + addChildren) so TanStack keeps full type inference, so keep them in sync.
import * as b from "./data/bindings";
import { NotFound, RootLayout } from "./pages/root";
import { Members, OrgHome, OrgLayout } from "./pages/org";
import { ProjectLayout, ProjectOverview, ProjectSettings } from "./pages/project";
import { DocumentPage } from "./pages/document";

export const routes = {
  // /                                    bound: whole store
  root: { component: RootLayout, notFoundComponent: NotFound, beforeLoad: b.root },

  // /$orgId                              bound: org
  org: { parent: "root", path: "$orgId", component: OrgLayout, beforeLoad: b.org },
  // /$orgId/                             inherits org
  orgHome: { parent: "org", path: "/", component: OrgHome },
  // /$orgId/members                      inherits org
  members: { parent: "org", path: "members", component: Members },

  // /$orgId/projects/$projectId          bound: project
  project: {
    parent: "org",
    path: "projects/$projectId",
    component: ProjectLayout,
    beforeLoad: b.project,
  },
  // …/                                   inherits project
  projectOverview: { parent: "project", path: "/", component: ProjectOverview },
  // …/settings                           inherits project
  projectSettings: { parent: "project", path: "settings", component: ProjectSettings },
  // …/docs/$documentId                   bound: document
  document: {
    parent: "project",
    path: "docs/$documentId",
    component: DocumentPage,
    beforeLoad: b.document,
  },

  // /d/$orgId/$projectId/$documentId     bound: document (many-to-one)
  shareLink: {
    parent: "root",
    path: "d/$orgId/$projectId/$documentId",
    component: DocumentPage,
    beforeLoad: b.document,
  },
} as const;
