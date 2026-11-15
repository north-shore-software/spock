// The State app: the data the current route is bound to, as a live tree. It
// opens along the path to each bound node, marks which route bound it, and
// highlights the page's own node. Values flash when they change.
import { watchRouter, type DevData, type DevRouter } from "@spock/router/devtools";
import type { ToolbarApp } from "../app";
import { fromMarkup, h, type Child } from "../dom";
import { icons } from "../icons";

/** Children shown per object before "… n more". */
const childLimit = 200;
const maxDepth = 32;

export const stateApp: ToolbarApp = {
  id: "state",
  name: "State",
  icon: icons.state,
  init(host) {
    const view = createView(host.panel);
    let router: DevRouter | undefined;
    let unsubscribe: (() => void)[] = [];
    // Rendering is skipped while the window is closed; opening catches up.
    const render = () => {
      if (host.isOpen) view.render(router);
    };
    watchRouter((next) => {
      unsubscribe.forEach((off) => off());
      router = next;
      unsubscribe = next ? [next.subscribe(render), next.subscribeData(render)] : [];
      render();
    });
    host.onToggle((open) => open && render());
  },
};

type Path = (string | number)[];
const keyOf = (path: Path) => JSON.stringify(path);

function createView(panel: HTMLElement) {
  /** Keys of the expanded objects; kept across renders. */
  const expanded = new Set<string>();
  /** Each primitive's value at the last render, to flash the ones that change. */
  let previous = new Map<string, unknown>();
  /** Which bound paths were last opened automatically; see `openBoundPaths`. */
  let openedFor: string | undefined;
  let rootRoute: string | undefined;
  let rows = new Map<string, HTMLElement>();
  let router: DevRouter | undefined;

  function render(next: DevRouter | undefined) {
    router = next;
    const data = router?.data();
    if (!data) {
      previous = new Map();
      panel.replaceChildren(
        h("p", { class: "empty" }, router ? "No route on this page is bound to data." : "No spock router on this page."),
      );
      return;
    }
    openBoundPaths(data);

    const boundAt = new Map<string, string[]>();
    for (const { route, path } of data.bound) {
      if (path) boundAt.set(keyOf(path), [...(boundAt.get(keyOf(path)) ?? []), route]);
    }
    const current = data.bound.at(-1)?.path;
    const tree = buildTree({ expanded, previous, boundAt, current: current && keyOf(current), toggle }, data.root);
    previous = tree.values;
    rows = tree.rows;

    panel.replaceChildren(
      h("div", { class: "section" }, h("h3", {}, "Bound nodes"), boundList(data)),
      h(
        "div",
        { class: "section" },
        h("h3", {}, "Data ", h("span", { class: "dim" }, `under ${data.rootRoute}`)),
        h("div", { class: "tree" }, ...tree.body),
      ),
    );
  }

  /**
   * Opens the path down to each bound node, and the node itself, when the
   * bound nodes change, i.e. on navigation. Data changes leave the user's own
   * opening and closing alone.
   */
  function openBoundPaths(data: DevData) {
    // A different root is a different tree: start it fresh.
    if (data.rootRoute !== rootRoute) {
      rootRoute = data.rootRoute;
      expanded.clear();
      previous = new Map();
    }
    const signature = JSON.stringify(data.bound);
    if (signature === openedFor) return;
    openedFor = signature;
    for (const { path } of data.bound) if (path) openPath(path);
  }

  function openPath(path: Path) {
    for (let i = 1; i <= path.length; i++) expanded.add(keyOf(path.slice(0, i)));
  }

  function toggle(key: string) {
    if (!expanded.delete(key)) expanded.add(key);
    render(router);
  }

  function reveal(path: string[]) {
    openPath(path);
    render(router);
    rows.get(keyOf(path))?.scrollIntoView({ block: "nearest" });
  }

  function boundList(data: DevData) {
    return h(
      "div",
      { class: "bound-list" },
      ...data.bound.map(({ route, path }, index) => {
        const isCurrent = index === data.bound.length - 1;
        const where = path === undefined ? "not under the root node" : path.length === 0 ? "the whole tree" : path.join(".");
        const contents: Child[] = [
          h("code", { class: "bound-route" }, route),
          h("code", { class: "bound-path" }, where),
          isCurrent ? h("span", { class: "tag bound" }, "this page") : null,
        ];
        if (path === undefined || path.length === 0) return h("div", { class: "bound-item" }, ...contents);
        return h(
          "button",
          { class: "bound-item", type: "button", title: "Show in the tree", onclick: () => reveal(path) },
          ...contents,
        );
      }),
    );
  }

  return { render };
}

type TreeOptions = {
  expanded: Set<string>;
  /** Each primitive's value at the last render. */
  previous: Map<string, unknown>;
  /** The routes bound to each node, by key. */
  boundAt: Map<string, string[]>;
  /** The key of the page's own node. */
  current: string | undefined;
  toggle: (key: string) => void;
};

/** The rows for one render, plus each row and primitive value by key. */
function buildTree(options: TreeOptions, root: unknown) {
  const { expanded, previous, boundAt, current, toggle } = options;
  const rows = new Map<string, HTMLElement>();
  const values = new Map<string, unknown>();

  function children(value: object, path: Path, depth: number): HTMLElement[] {
    const entries = entriesOf(value);
    const shown = entries.slice(0, childLimit).flatMap(([key, child]) => node(key, child, [...path, key], depth));
    if (entries.length > childLimit) {
      shown.push(row(depth, h("span", { class: "dim" }, `… ${entries.length - childLimit} more`)));
    }
    return shown;
  }

  function node(key: string | number, value: unknown, path: Path, depth: number): HTMLElement[] {
    const id = keyOf(path);
    const label = h("span", { class: typeof key === "number" ? "key index" : "key" }, String(key));

    if (typeof value !== "object" || value === null) {
      const element = row(depth, h("span", { class: "spacer" }), label, h("span", { class: "colon" }, ":"), primitive(value));
      if (previous.has(id) && !Object.is(previous.get(id), value)) element.classList.add("changed");
      values.set(id, value);
      rows.set(id, element);
      return [element];
    }

    const open = expanded.has(id) && depth < maxDepth;
    const element = h(
      "button",
      {
        class: ["row", "branch", id === current && "current"].filter(Boolean).join(" "),
        type: "button",
        style: `--depth: ${depth}`,
        "aria-expanded": String(open),
        onclick: () => toggle(id),
      },
      h("span", { class: "chevron" }, fromMarkup(icons.chevron)),
      label,
      open ? null : h("span", { class: "preview" }, preview(value)),
      ...(boundAt.get(id) ?? []).map((route) => h("span", { class: "tag bound" }, route)),
    );
    rows.set(id, element);
    return open ? [element, ...children(value, path, depth + 1)] : [element];
  }

  const body = typeof root === "object" && root !== null ? children(root, [], 0) : [row(0, primitive(root))];
  return { body, rows, values };
}

function row(depth: number, ...children: Child[]) {
  return h("div", { class: "row", style: `--depth: ${depth}` }, ...children);
}

function entriesOf(value: object): [string | number, unknown][] {
  if (Array.isArray(value)) return value.map((item, index) => [index, item]);
  return Object.entries(value);
}

function preview(value: object): string {
  if (Array.isArray(value)) return `Array(${value.length})`;
  const keys = Object.keys(value);
  if (keys.length === 0) return "{}";
  return `{ ${keys.slice(0, 3).join(", ")}${keys.length > 3 ? ", …" : ""} }`;
}

function primitive(value: unknown) {
  if (typeof value === "string") {
    const text = JSON.stringify(value);
    return h("span", { class: "value string", title: value }, text.length > 120 ? `${text.slice(0, 119)}…"` : text);
  }
  if (typeof value === "number" || typeof value === "bigint") {
    return h("span", { class: "value number" }, typeof value === "bigint" ? `${value}n` : String(value));
  }
  if (typeof value === "function") return h("span", { class: "value dim" }, "ƒ");
  return h("span", { class: "value keyword" }, String(value));
}
