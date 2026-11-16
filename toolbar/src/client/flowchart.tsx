// The flowchart in the full-screen overlay: every screen, grouped by the
// layout routes they sit in, with an arrow for each way the source links one
// to another. The page's screen is highlighted, along with the arrows out of
// it, including the ones from layouts around it. Hovering a box highlights
// its arrows instead. Clicking a screen goes there when the page has its
// params; clicking an arrow opens its `<Link>` in the editor.
import { watchRouter, type DevMatch, type DevRouter } from "@spock/router/devtools";
import type { FlowGraph, FlowLink } from "@spock/router/flows/graph";
import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { flowsData } from "./flows-data";
import { layoutFlows, navId, screenId, sizes, type FlowArrow, type FlowLayout, type Measure, type Point } from "./flowchart-layout";

const mono = `ui-monospace, "SF Mono", Menlo, Consolas, monospace`;
const fonts = {
  name: `600 13px ${mono}`,
  path: `11px ${mono}`,
  nav: `12px system-ui, -apple-system, "Segoe UI", sans-serif`,
  group: `600 12px ${mono}`,
};

/** Measures with a canvas, in the fonts the SVG draws with. */
function createMeasure(): Measure {
  const context = document.createElement("canvas").getContext("2d")!;
  return (text, font) => {
    context.font = fonts[font];
    return context.measureText(text).width;
  };
}

/** The router, and the route the page is on, kept current. */
function usePage(): { router: DevRouter | undefined; here: DevMatch | undefined } {
  const [page, setPage] = useState<{ router: DevRouter | undefined; here: DevMatch | undefined }>({
    router: undefined,
    here: undefined,
  });
  useEffect(() => {
    let off: (() => void) | undefined;
    const stop = watchRouter((router) => {
      off?.();
      const read = () => setPage({ router, here: router?.state().matches.at(-1) });
      off = router?.subscribe(read);
      read();
    });
    return () => {
      off?.();
      stop();
    };
  }, []);
  return page;
}

/** `active`: the overlay is open. The layout is only worked out while it is. */
export function FlowChart({ active }: { active: boolean }) {
  const message = useSyncExternalStore(flowsData.subscribe, flowsData.get);
  const { router, here } = usePage();
  const [layout, setLayout] = useState<{ for: FlowGraph; layout: FlowLayout }>();
  const [error, setError] = useState<string>();
  const [hovered, setHovered] = useState<string>();
  const measure = useMemo(() => createMeasure(), []);
  const graph = message && "graph" in message ? message.graph : undefined;

  useEffect(() => {
    if (!active || !graph || layout?.for === graph) return;
    let cancelled = false;
    layoutFlows(graph, measure).then(
      (next) => {
        if (cancelled) return;
        setLayout({ for: graph, layout: next });
        setError(undefined);
      },
      (reason: unknown) => !cancelled && setError(String(reason)),
    );
    return () => {
      cancelled = true;
    };
  }, [active, graph, layout, measure]);

  if (!message) return <p className="empty">Waiting for the flow graph from the dev server…</p>;
  if ("error" in message) return <div className="banner">Couldn't read the flow graph: {message.error}</div>;
  if (error) return <div className="banner">Couldn't lay out the flow graph: {error}</div>;
  if (!layout) return <p className="empty">Laying out…</p>;
  return (
    <Chart
      graph={layout.for}
      layout={layout.layout}
      root={message.root}
      router={router}
      here={here}
      hovered={hovered}
      setHovered={setHovered}
    />
  );
}

type ChartProps = {
  graph: FlowGraph;
  layout: FlowLayout;
  root: string;
  router: DevRouter | undefined;
  here: DevMatch | undefined;
  hovered: string | undefined;
  setHovered: (id: string | undefined) => void;
};

function Chart({ graph, layout, root, router, here, hovered, setHovered }: ChartProps) {
  const routes = useMemo(() => new Map(graph.routes.map((route) => [route.name, route])), [graph]);
  const hereScreen = here && routes.get(here.name)?.screen ? screenId(here.name) : undefined;

  // The nodes whose arrows are highlighted: the hovered one, or else the page's
  // screen and the links nodes of the layouts around it.
  const sources = useMemo(() => {
    if (hovered) return new Set([hovered]);
    const ids = new Set<string>();
    if (!hereScreen || !here) return ids;
    ids.add(hereScreen);
    for (let route = routes.get(here.name); route; route = route.parent ? routes.get(route.parent) : undefined) {
      ids.add(navId(route.name));
    }
    return ids;
  }, [hovered, hereScreen, here, routes]);
  const lit = (arrow: FlowArrow) => sources.has(arrow.from) || (hovered !== undefined && arrow.to === hovered);

  const known = here?.params ?? {};
  const pad = 2;
  return (
    <div className="flowchart">
      {graph.problems.length > 0 && (
        <div className="banner">
          {graph.problems.length} problem{graph.problems.length === 1 ? "" : "s"}: the chart is missing links. The Flows
          app lists them.
        </div>
      )}
      <Legend />
      <svg
        className="flowchart-svg"
        width={layout.width + 2 * pad}
        height={layout.height + 2 * pad}
        viewBox={`${-pad} ${-pad} ${layout.width + 2 * pad} ${layout.height + 2 * pad}`}
        role="img"
        aria-label="User flows between screens"
      >
        {layout.groups.map((group) => (
          <g key={group.id} className="fc-group" data-depth={group.depth}>
            <rect x={group.x} y={group.y} width={group.width} height={group.height} rx={10} />
            <text x={group.x + sizes.groupPad} y={group.y + 19}>
              <tspan className="fc-group-name">{group.route}</tspan>
              {group.path && <tspan className="fc-group-path" dx={8}>{group.path}</tspan>}
            </text>
          </g>
        ))}
        {layout.arrows
          // Lit arrows draw last, on top.
          .toSorted((a, b) => Number(lit(a)) - Number(lit(b)))
          .map((arrow) => (
            <Arrow
              key={arrow.id}
              arrow={arrow}
              links={arrow.links.map((index) => graph.links[index]!)}
              lit={lit(arrow)}
              dim={(hovered !== undefined || sources.size > 0) && !lit(arrow)}
              root={root}
            />
          ))}
        {layout.navs.map((nav) => (
          <g
            key={nav.id}
            className="fc-nav"
            data-lit={sources.has(nav.id) ? "" : undefined}
            onMouseEnter={() => setHovered(nav.id)}
            onMouseLeave={() => setHovered(undefined)}
          >
            <title>{`Links in ${nav.component}: on every screen in ${nav.route}`}</title>
            <rect x={nav.x} y={nav.y} width={nav.width} height={nav.height} rx={nav.height / 2} />
            <text x={nav.x + nav.width / 2} y={nav.y + nav.height / 2 + 4} textAnchor="middle">
              {nav.component}
            </text>
          </g>
        ))}
        {layout.screens.map((screen) => {
          const route = routes.get(screen.route)!;
          const missing = route.params.filter((name) => known[name] === undefined);
          const canGo = router !== undefined && missing.length === 0 && screen.id !== hereScreen;
          return (
            <g
              key={screen.id}
              className="fc-screen"
              data-here={screen.id === hereScreen ? "" : undefined}
              data-go={canGo ? "" : undefined}
              onMouseEnter={() => setHovered(screen.id)}
              onMouseLeave={() => setHovered(undefined)}
              onClick={() => {
                if (!canGo) return;
                setHovered(undefined);
                router.navigate(route.name, Object.fromEntries(route.params.map((name) => [name, known[name]!])));
              }}
            >
              <title>
                {screen.id === hereScreen
                  ? `${route.name}: this page`
                  : canGo
                    ? `Go to ${route.name}`
                    : `${route.name}: needs ${missing.join(", ")} to go there`}
              </title>
              <rect x={screen.x} y={screen.y} width={screen.width} height={screen.height} rx={6} />
              <text className="fc-screen-name" x={screen.x + sizes.screenPadX} y={screen.y + 19}>
                {route.name}
              </text>
              {screen.entry && (
                <text className="fc-entry" x={screen.x + screen.width - sizes.screenPadX} y={screen.y + 18} textAnchor="end">
                  entry
                </text>
              )}
              <text className="fc-screen-path" x={screen.x + sizes.screenPadX} y={screen.y + 35}>
                {screen.path}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function Arrow(props: { arrow: FlowArrow; links: FlowLink[]; lit: boolean; dim: boolean; root: string }) {
  const { arrow, links, lit, dim, root } = props;
  const d = arrow.points.map((point, index) => `${index === 0 ? "M" : "L"}${point.x} ${point.y}`).join(" ");
  const first = links[0]?.at;
  return (
    <g
      className="fc-arrow"
      data-lit={lit ? "" : undefined}
      data-dim={dim ? "" : undefined}
      onClick={() => first && void fetch(`/__open-in-editor?file=${encodeURIComponent(`${root}/${first.file}:${first.line}`)}`)}
    >
      <title>
        {links.map((link) => `${link.at.component ?? "?"} · ${link.at.file}:${link.at.line}`).join("\n")}
        {"\nClick to open in your editor"}
      </title>
      {/* A wide invisible stroke, so the arrow is easy to hover and click. */}
      <path className="fc-arrow-hit" d={d} />
      <path className="fc-arrow-line" d={d} />
      <polygon className="fc-arrow-head" points={arrowHead(arrow.points)} />
    </g>
  );
}

/** A triangle at the last point, pointing along the last segment. */
function arrowHead(points: Point[]): string {
  const tip = points.at(-1)!;
  const from = points.at(-2) ?? tip;
  const length = Math.hypot(tip.x - from.x, tip.y - from.y) || 1;
  const ux = (tip.x - from.x) / length;
  const uy = (tip.y - from.y) / length;
  const back = { x: tip.x - ux * 8, y: tip.y - uy * 8 };
  return [tip, { x: back.x - uy * 4, y: back.y + ux * 4 }, { x: back.x + uy * 4, y: back.y - ux * 4 }]
    .map((point) => `${point.x},${point.y}`)
    .join(" ");
}

function Legend() {
  return (
    <div className="flowchart-legend">
      <span>
        <i className="fc-key-screen" /> Screen
      </span>
      <span>
        <i className="fc-key-here" /> This page
      </span>
      <span>
        <i className="fc-key-nav" /> A layout's links, on every screen inside it
      </span>
      <span>
        <i className="fc-key-group" /> Layout route
      </span>
      <span className="dim">Click a screen to go there, an arrow to open its Link in your editor.</span>
    </div>
  );
}
