// The Flows app: the user-flow graph read from the app's source by the Vite
// plugin, seen from one screen at a time. It shows where the screen's links
// lead and which screens link to it, with each link's place in the source,
// and lists every screen with its entry points and dead ends. It follows the
// page; picking a screen in the list looks at that one instead.
import type { FlowGraph, FlowRoute } from "@spock/router/flows/graph";
import { watchRouter, type DevRouter } from "@spock/router/devtools";
import { flowsEvent, flowsRequest, type FlowsMessage } from "../../flows-message";
import type { ToolbarApp } from "../app";
import { h, type Child } from "../dom";
import { icons } from "../icons";

export const flowsApp: ToolbarApp = {
  id: "flows",
  name: "Flows",
  icon: icons.flows,
  init(host) {
    let message: FlowsMessage | undefined;
    let router: DevRouter | undefined;
    let unsubscribe: (() => void) | undefined;
    /** A screen picked in the list; `undefined` follows the page. */
    let picked: string | undefined;

    const render = () => {
      if (message && "graph" in message) host.notify(message.graph.problems.length > 0);
      // Rendering is skipped while the window is closed; opening catches up.
      if (!host.isOpen) return;
      host.panel.replaceChildren(
        ...view(message, router, picked, (name) => {
          picked = name;
          render();
        }),
      );
    };

    import.meta.hot?.on(flowsEvent, (next: FlowsMessage) => {
      message = next;
      render();
    });
    import.meta.hot?.send(flowsRequest);
    watchRouter((next) => {
      unsubscribe?.();
      router = next;
      unsubscribe = next?.subscribe(render);
      render();
    });
    host.onToggle((open) => open && render());
  },
};

function view(
  message: FlowsMessage | undefined,
  router: DevRouter | undefined,
  picked: string | undefined,
  pick: (name: string | undefined) => void,
): HTMLElement[] {
  if (!message) return [h("p", { class: "empty" }, "Waiting for the flow graph from the dev server…")];
  if ("error" in message) {
    return [h("div", { class: "banner" }, "Couldn't read the flow graph: ", message.error)];
  }
  const { graph, root } = message;
  const routes = new Map(graph.routes.map((route) => [route.name, route]));
  const onPage = router?.state().matches.at(-1)?.name;
  const focus = picked ?? (onPage && routes.get(onPage)?.screen ? onPage : undefined);
  const context: Context = { graph, root, routes, router, onPage, focus, pick };
  return [
    ...(graph.problems.length > 0 ? [problems(context)] : []),
    ...(focus ? focusView(context, routes.get(focus)!) : [h("p", { class: "empty" }, "This page isn't a screen in the graph.")]),
    section("All screens", screenList(context)),
  ];
}

type Context = {
  graph: FlowGraph;
  root: string;
  routes: Map<string, FlowRoute>;
  router: DevRouter | undefined;
  onPage: string | undefined;
  focus: string | undefined;
  pick: (name: string | undefined) => void;
};

function section(title: Child, ...children: Child[]) {
  return h("div", { class: "section" }, h("h3", {}, title), ...children);
}

function problems({ graph, root }: Context) {
  return h(
    "div",
    { class: "banner" },
    h("div", {}, `${graph.problems.length} problem${graph.problems.length === 1 ? "" : "s"}: the graph is incomplete.`),
    h(
      "ul",
      { class: "flow-problems" },
      ...graph.problems.map((problem) => h("li", {}, sourceButton(root, problem.at), " ", problem.message)),
    ),
  );
}

function focusView(context: Context, screen: FlowRoute): HTMLElement[] {
  const { graph, onPage, pick } = context;
  const out = graph.edges.filter((edge) => edge.from === screen.name && edge.to !== screen.name);
  const into = graph.edges.filter((edge) => edge.to === screen.name && edge.from !== screen.name);
  const following = screen.name === onPage;
  return [
    section(
      following ? "This screen" : "Looking at",
      h(
        "div",
        { class: "flow-focus" },
        h("code", { class: "flow-name" }, screen.name),
        h("code", { class: "dim" }, screen.path ?? ""),
        following
          ? null
          : h("button", { class: "flow-follow", type: "button", onclick: () => pick(undefined) }, "Back to this page"),
      ),
    ),
    section(
      "Leads to",
      out.length === 0
        ? h("p", { class: "empty" }, "No links to other screens: a dead end.")
        : edgeList(context, out.map((edge) => ({ screen: edge.to, links: edge.links }))),
    ),
    section(
      "Reached from",
      into.length === 0
        ? h("p", { class: "empty" }, "No screen links here: reached only by URL.")
        : edgeList(context, into.map((edge) => ({ screen: edge.from, links: edge.links }))),
    ),
  ];
}

/** Each other screen, and the links that join it to the focused one. */
function edgeList(context: Context, rows: { screen: string; links: number[] }[]) {
  return h(
    "div",
    { class: "flow-edges" },
    ...rows.map(({ screen, links }) =>
      h(
        "div",
        { class: "flow-edge" },
        screenButton(context, screen),
        h(
          "div",
          { class: "flow-sources" },
          ...links.map((index) => sourceButton(context.root, context.graph.links[index]!.at)),
        ),
      ),
    ),
  );
}

/** A screen's name: picks it, so the view looks at it. */
function screenButton({ pick, focus, onPage }: Context, name: string) {
  return h(
    "button",
    {
      class: ["flow-screen", name === focus && "focus", name === onPage && "here"].filter(Boolean).join(" "),
      type: "button",
      title: `Look at ${name}`,
      onclick: () => pick(name),
    },
    name,
  );
}

/** `Component · file:line`, opening the file in the editor through Vite. */
function sourceButton(root: string, at: { file: string; line: number; component?: string }) {
  const label = `${at.file}:${at.line}`;
  return h(
    "button",
    {
      class: "flow-source",
      type: "button",
      title: `Open ${label} in your editor`,
      onclick: () => void fetch(`/__open-in-editor?file=${encodeURIComponent(`${root}/${label}`)}`),
    },
    at.component ? h("span", {}, at.component, " · ") : null,
    h("span", { class: "dim" }, label),
  );
}

/** Every screen, with how many screens it links to and from, and a way to go there. */
function screenList(context: Context) {
  const { graph, router, onPage } = context;
  const known = (onPage && router?.state().matches.at(-1)?.params) || {};
  const screens = graph.routes.filter((route) => route.screen);
  const count = (side: "from" | "to", name: string) =>
    new Set(graph.edges.filter((edge) => edge[side] === name && edge.from !== edge.to).map((edge) => edge[side === "from" ? "to" : "from"])).size;
  return h(
    "table",
    { class: "flow-table" },
    h("thead", {}, h("tr", {}, h("th", {}, "Screen"), h("th", {}, "In"), h("th", {}, "Out"), h("th", {}))),
    h(
      "tbody",
      {},
      ...screens.map((screen) => {
        const into = count("to", screen.name);
        const out = count("from", screen.name);
        const missing = screen.params.filter((name) => known[name] === undefined);
        return h(
          "tr",
          {},
          h("td", {}, screenButton(context, screen.name)),
          h("td", {}, into === 0 ? h("span", { class: "tag" }, "entry") : into),
          h("td", {}, out === 0 ? h("span", { class: "tag" }, "dead end") : out),
          h(
            "td",
            {},
            router && screen.path !== undefined && missing.length === 0 && screen.name !== onPage
              ? h(
                  "button",
                  {
                    class: "flow-go",
                    type: "button",
                    title: `Go to ${screen.name}`,
                    onclick: () =>
                      router.navigate(screen.name, Object.fromEntries(screen.params.map((name) => [name, known[name]!]))),
                  },
                  "Go",
                )
              : null,
          ),
        );
      }),
    ),
  );
}
