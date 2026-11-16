// A small app for the flows tests. It covers what templates/simple doesn't:
// a pathless layout, a link from a shared component, a renamed import, a
// conditional `to`, a not-found page with a link, and each kind of problem.
import { createRouter } from "@spock/router";
import { Home, Layout, Missing, Section, Settings, Team, TeamList, Teams } from "./pages.tsx";

export const router = createRouter({
  component: Layout,
  notFound: Missing,
  children: {
    home: { path: "/", component: Home },
    settings: { path: "settings", component: Settings },
    // Pathless: adds no URL segment.
    section: {
      component: Section,
      children: {
        teams: {
          path: "teams",
          component: Teams,
          children: {
            list: { path: "/", component: TeamList },
            team: { path: "$teamId", component: Team },
          },
        },
      },
    },
  },
});

declare module "@spock/router" {
  interface Register {
    router: typeof router;
  }
}
