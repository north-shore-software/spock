// The route tree. Keys name the routes (`org.project.settings`); paths are
// relative to the parent. A route with `data` is bound to that node; routes
// without it inherit the nearest bound ancestor's node.
import { createRouter } from "@spock/router";
import * as b from "./data/bindings";
import { DocumentPage } from "./pages/document";
import { Members, OrgHome, OrgLayout } from "./pages/org";
import { ProjectLayout, ProjectOverview, ProjectSettings } from "./pages/project";
import { NotFound, RootLayout } from "./pages/root";

export const router = createRouter({
  // /                                    bound: whole store
  component: RootLayout,
  notFound: NotFound,
  data: b.root,
  children: {
    // /$orgId                            bound: org
    org: {
      path: "$orgId",
      component: OrgLayout,
      data: b.org,
      children: {
        // /$orgId/                       inherits org
        home: { path: "/", component: OrgHome },
        // /$orgId/members                inherits org
        members: { path: "members", component: Members },
        // /$orgId/projects/$projectId    bound: project
        project: {
          path: "projects/$projectId",
          component: ProjectLayout,
          data: b.project,
          children: {
            // …/                         inherits project
            overview: { path: "/", component: ProjectOverview },
            // …/settings                 inherits project
            settings: { path: "settings", component: ProjectSettings },
            // …/docs/$documentId         bound: document
            document: { path: "docs/$documentId", component: DocumentPage, data: b.document },
          },
        },
      },
    },
    // /d/$orgId/$projectId/$documentId   bound: document (many-to-one)
    shareLink: { path: "d/$orgId/$projectId/$documentId", component: DocumentPage, data: b.document },
  },
});

declare module "@spock/router" {
  interface Register {
    router: typeof router;
  }
}
