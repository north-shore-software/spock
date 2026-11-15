// The route tree. Every route is declared here, code-based (no file routes).
// Routes with `beforeLoad: b.x` are bound to a data node; routes without it
// inherit the nearest bound ancestor's node through route context.
import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import * as b from "./data/bindings";
import { NotFound, RootLayout } from "./pages/root";
import { OrgHome, OrgLayout } from "./pages/org";

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
  beforeLoad: b.root,
});

const orgRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "$orgId",
  component: OrgLayout,
  beforeLoad: b.org,
});

const orgHomeRoute = createRoute({
  getParentRoute: () => orgRoute,
  path: "/",
  component: OrgHome,
});

const routeTree = rootRoute.addChildren([orgRoute.addChildren([orgHomeRoute])]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
