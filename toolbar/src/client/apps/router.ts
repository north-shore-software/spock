// The Router app: where you are, which routes matched and where each got its
// data node, and the whole route tree, where any route you have the params
// for is a link.
import {
  watchRouter,
  type DevMatch,
  type DevNotFound,
  type DevRouter,
  type DevRouterState,
} from "@spock/router/devtools";
import type { AppHost, ToolbarApp } from "../app";
import { h, type Child } from "../dom";
import { icons } from "../icons";

export const routerApp: ToolbarApp = {
  id: "router",
  name: "Router",
  icon: icons.router,
  init(host) {
    let unsubscribe: (() => void) | undefined;
    watchRouter((router) => {
      unsubscribe?.();
      unsubscribe = router?.subscribe(() => render(host, router));
      render(host, router);
    });
  },
};

function render(host: AppHost, router: DevRouter | undefined) {
  if (!router) {
    host.notify(false);
    host.panel.replaceChildren(h("p", { class: "empty" }, "No spock router on this page."));
    return;
  }
  const state = router.state();
  host.notify(state.notFound !== undefined);
  host.panel.replaceChildren(
    ...(state.notFound ? [notFoundBanner(state.notFound)] : []),
    section("Location", h("code", { class: "location" }, state.pathname + state.search)),
    section("Matched routes", matchTable(router, state)),
    section("Route tree", routeTree(router, state)),
  );
}

function section(title: string, ...children: Child[]) {
  return h("div", { class: "section" }, h("h3", {}, title), ...children);
}

function notFoundBanner(notFound: DevNotFound) {
  return h(
    "div",
    { class: "banner" },
    notFound.reason === "url"
      ? "Not found: no route matches this URL."
      : h("span", {}, "Not found: ", h("code", {}, notFound.route), "'s data selector found nothing for these params."),
  );
}

function matchTable(router: DevRouter, { matches, notFound }: DevRouterState) {
  const routeParams = new Map(router.routes.map((route) => [route.name, route.params]));
  if (matches.length === 0) return h("p", { class: "empty" }, "Nothing matched yet.");
  return h(
    "table",
    { class: "matches" },
    h("thead", {}, h("tr", {}, h("th", {}, "Route"), h("th", {}, "Params"), h("th", {}, "Data node"))),
    h(
      "tbody",
      {},
      ...matches.map((match, index) => {
        // Every match carries all the URL's params; show only the ones its
        // route's path adds to its parent's.
        const inherited = new Set(routeParams.get(matches[index - 1]?.name ?? "") ?? []);
        const own = (routeParams.get(match.name) ?? [])
          .filter((name) => !inherited.has(name))
          .map((name) => [name, match.params[name]] as const);
        return h(
          "tr",
          {},
          h("td", {}, h("code", {}, match.name)),
          h(
            "td",
            {},
            own.length === 0 ? h("span", { class: "dim" }, "—") : null,
            ...own.map(([name, value]) => h("code", { class: "param" }, `${name}=${value}`)),
          ),
          h("td", {}, dataNode(match, notFound)),
        );
      }),
    ),
  );
}

function dataNode(match: DevMatch, notFound: DevNotFound | undefined): Child {
  if (notFound?.reason === "data" && notFound.route === match.name) {
    return h("span", { class: "tag danger" }, "missing");
  }
  if (match.boundAt === undefined) return h("span", { class: "dim" }, "none");
  if (match.boundAt === match.name) return "bound here";
  return h("span", {}, "from ", h("code", {}, match.boundAt));
}

function routeTree(router: DevRouter, state: DevRouterState) {
  const active = new Set(state.matches.map((match) => match.name));
  const current = state.matches.at(-1);
  const known = current?.params ?? {};
  return h(
    "div",
    { class: "routes" },
    ...router.routes.map((route) => {
      const missing = route.params.filter((name) => known[name] === undefined);
      const reachable = route.path !== undefined && missing.length === 0;
      const classes = ["route", active.has(route.name) && "active", route.name === current?.name && "current"];
      const contents: Child[] = [
        h("code", { class: "route-name" }, route.name === "root" ? "root" : route.name.split(".").at(-1)!),
        route.bound ? h("span", { class: "tag" }, "data") : null,
        h("code", { class: "route-path" }, route.path ?? "layout"),
      ];
      const props = { class: classes.filter(Boolean).join(" "), style: `--depth: ${route.depth}` };
      if (!reachable) {
        const why = route.path === undefined ? "Pathless layout" : `Needs ${missing.join(", ")}`;
        return h("div", { ...props, title: `${route.name}: ${why}` }, ...contents);
      }
      const params = Object.fromEntries(route.params.map((name) => [name, known[name]!]));
      return h(
        "button",
        { ...props, type: "button", title: `Go to ${route.name}`, onclick: () => router.navigate(route.name, params) },
        ...contents,
      );
    }),
  );
}
