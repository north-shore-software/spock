import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Edge, Node, NodeTypes, EdgeTypes } from "@xyflow/react";
import { Background, Controls, MiniMap, ReactFlow, ReactFlowProvider, useReactFlow } from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Crosshair, Search, TriangleAlert } from "lucide-react";
import type { FlowMap } from "../../scripts/lib/flow-map-schema";
import { layoutFlowMap, type LayoutResult, type ScreenshotManifest, type TransitionEdgeData } from "./layout";
import { ChromeNode, PageNode, StageNode, SwimlaneNode } from "./canvas-nodes";
import { EdgeTooltip, EdgeTooltipContext, TransitionEdge, type TooltipPayload } from "./transition-edge";

const nodeTypes: NodeTypes = {
  page: PageNode,
  swimlane: SwimlaneNode,
  chrome: ChromeNode,
  stage: StageNode,
};
const edgeTypes: EdgeTypes = { transition: TransitionEdge };

export function CanvasRoute() {
  return (
    <ReactFlowProvider>
      <CanvasInner />
    </ReactFlowProvider>
  );
}

function CanvasInner() {
  const [flowMap, setFlowMap] = useState<FlowMap | null>(null);
  const [graph, setGraph] = useState<LayoutResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiddenFeatures, setHiddenFeatures] = useState<ReadonlySet<string>>(new Set());
  const [showStages, setShowStages] = useState(false);
  const [tooltip, setTooltip] = useState<TooltipPayload | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { fitView } = useReactFlow();

  useEffect(() => {
    (async () => {
      const flowMapRes = await fetch("/ux-flow-map.json");
      if (!flowMapRes.ok) {
        throw new Error(`ux-flow-map.json not found (HTTP ${flowMapRes.status})`);
      }
      const map = (await flowMapRes.json()) as FlowMap;
      const manifestRes = await fetch("/screenshots/manifest.json");
      const manifest: ScreenshotManifest = manifestRes.ok ? await manifestRes.json() : {};
      setFlowMap(map);
      setGraph(await layoutFlowMap(map, manifest));
      requestAnimationFrame(() => fitView({ padding: 0.1 }));
    })().catch((e: unknown) => setError(String(e)));
  }, [fitView]);

  const laneFeature = useMemo(() => {
    const byLaneId = new Map<string, string>();
    for (const n of graph?.nodes ?? []) {
      if (n.type === "swimlane") byLaneId.set(n.id, (n.data as { label: string }).label);
    }
    return byLaneId;
  }, [graph]);

  const nodeHidden = useCallback(
    (n: Node) => {
      const feature = n.type === "swimlane" ? laneFeature.get(n.id) : laneFeature.get(n.parentId ?? "");
      return feature != null && hiddenFeatures.has(feature);
    },
    [laneFeature, hiddenFeatures],
  );

  const nodes: Node[] = useMemo(() => {
    if (!graph) return [];
    return graph.nodes.map((n) => ({
      ...n,
      hidden: nodeHidden(n),
      data: n.type === "page" ? { ...n.data, highlighted: n.id === highlightId } : n.data,
    }));
  }, [graph, nodeHidden, highlightId]);

  const nodeById = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const edges: Edge<TransitionEdgeData>[] = useMemo(() => {
    if (!graph) return [];
    return graph.edges.map((e) => ({
      ...e,
      hidden:
        (e.data?.kind === "stage" && !showStages) ||
        !!nodeById.get(e.source)?.hidden ||
        !!nodeById.get(e.target)?.hidden,
    }));
  }, [graph, nodeById, showStages]);

  const focusRoute = useCallback(
    (routeId: string) => {
      setHighlightId(routeId);
      if (highlightTimer.current) clearTimeout(highlightTimer.current);
      highlightTimer.current = setTimeout(() => setHighlightId(null), 2000);
      void fitView({ nodes: [{ id: routeId }], duration: 500, padding: 0.35, maxZoom: 1.1 });
    },
    [fitView],
  );

  if (error) {
    return (
      <FullScreenMessage>
        <TriangleAlert size={22} className="text-amber-400" />
        <div className="text-sm font-bold text-zinc-100">Canvas data not available</div>
        <p className="text-xs text-zinc-400 max-w-sm leading-relaxed">
          {error}. Generate the artifacts first — in the project root run{" "}
          <code className="text-indigo-300 font-mono">pnpm ux:all</code>, then reload this page.
        </p>
      </FullScreenMessage>
    );
  }
  if (!graph || !flowMap) {
    return (
      <FullScreenMessage>
        <div className="text-xs font-mono text-zinc-500 animate-pulse">Laying out flow map…</div>
      </FullScreenMessage>
    );
  }

  return (
    <EdgeTooltipContext.Provider value={{ show: setTooltip, hide: () => setTooltip(null) }}>
      <div className="w-screen h-screen bg-[#09090b] text-zinc-100 font-sans">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          minZoom={0.08}
          fitView
        >
          <Background color="#1c1c1f" gap={22} size={1.4} />
          <Controls className="!bg-zinc-900 !border !border-zinc-800 !shadow-2xl [&>button]:!bg-zinc-900 [&>button]:!border-zinc-800 [&>button]:!fill-zinc-300" />
          <MiniMap
            pannable
            zoomable
            className="!bg-zinc-950 !border !border-zinc-800"
            nodeColor={(n) => (n.type === "swimlane" ? "#17171a" : "#312e81")}
            maskColor="rgba(9, 9, 11, 0.75)"
          />
        </ReactFlow>

        <Toolbar
          flowMap={flowMap}
          features={graph.features}
          hiddenFeatures={hiddenFeatures}
          onToggleFeature={(feature) =>
            setHiddenFeatures((prev) => {
              const next = new Set(prev);
              if (next.has(feature)) next.delete(feature);
              else next.add(feature);
              return next;
            })
          }
          showStages={showStages}
          onToggleStages={() => setShowStages((v) => !v)}
          onFocusRoute={focusRoute}
          onFit={() => void fitView({ padding: 0.1, duration: 400 })}
        />
        <EdgeTooltip payload={tooltip} />
      </div>
    </EdgeTooltipContext.Provider>
  );
}

function FullScreenMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-screen h-screen bg-[#09090b] flex flex-col items-center justify-center space-y-3 p-8 text-center">
      {children}
    </div>
  );
}

type SearchHit = { routeId: string; label: string; detail: string };

function Toolbar({
  flowMap,
  features,
  hiddenFeatures,
  onToggleFeature,
  showStages,
  onToggleStages,
  onFocusRoute,
  onFit,
}: {
  flowMap: FlowMap;
  features: string[];
  hiddenFeatures: ReadonlySet<string>;
  onToggleFeature: (feature: string) => void;
  showStages: boolean;
  onToggleStages: () => void;
  onFocusRoute: (routeId: string) => void;
  onFit: () => void;
}) {
  const [query, setQuery] = useState("");

  const hits: SearchHit[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    const out: SearchHit[] = [];
    for (const r of flowMap.routes) {
      if (r.id.includes(q) || r.path.toLowerCase().includes(q)) {
        out.push({ routeId: r.id, label: r.id, detail: r.path });
        continue;
      }
      const story = r.stories.find((s) => s.name.toLowerCase().includes(q));
      if (story) {
        out.push({ routeId: r.id, label: r.id, detail: `story: ${story.name}` });
        continue;
      }
      const transition = r.transitions.find((t) => t.trigger.toLowerCase().includes(q));
      if (transition) out.push({ routeId: r.id, label: r.id, detail: `“${transition.trigger}”` });
    }
    return out.slice(0, 8);
  }, [flowMap, query]);

  return (
    <div className="absolute top-4 left-4 z-50 w-[290px] space-y-2.5 bg-zinc-950/85 backdrop-blur-md border border-zinc-800 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-[13px] font-bold text-zinc-100">UX Flow Canvas</h1>
          <p className="text-[9px] font-mono text-zinc-500 uppercase tracking-wider">
            {flowMap.routes.length} routes · generated {flowMap.generatedAt.slice(0, 10)}
          </p>
        </div>
        <button
          onClick={onFit}
          title="Zoom to fit"
          className="p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition"
        >
          <Crosshair size={14} />
        </button>
      </div>

      <div className="relative">
        <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-zinc-600" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search routes, stories, triggers…"
          className="w-full bg-zinc-900/80 border border-zinc-800 focus:border-indigo-500/50 outline-none rounded-lg pl-7 pr-2 py-1.5 text-[11px] text-zinc-200 placeholder:text-zinc-600"
        />
        {hits.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-zinc-950 border border-zinc-800 rounded-lg shadow-2xl overflow-hidden z-10">
            {hits.map((hit, i) => (
              <button
                key={`${hit.routeId}-${i}`}
                onClick={() => {
                  onFocusRoute(hit.routeId);
                  setQuery("");
                }}
                className="w-full text-left px-3 py-1.5 hover:bg-zinc-900 transition flex items-baseline justify-between gap-2"
              >
                <span className="text-[11px] font-semibold text-zinc-200">{hit.label}</span>
                <span className="text-[9px] font-mono text-zinc-500 truncate">{hit.detail}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-1.5 pt-0.5">
        {features.map((feature) => {
          const hidden = hiddenFeatures.has(feature);
          return (
            <button
              key={feature}
              onClick={() => onToggleFeature(feature)}
              className={`text-[9.5px] font-mono px-2 py-1 rounded-full border transition ${
                hidden
                  ? "text-zinc-600 border-zinc-800/70 line-through"
                  : "text-indigo-300 bg-indigo-500/10 border-indigo-500/25"
              }`}
            >
              {feature}
            </button>
          );
        })}
        <button
          onClick={onToggleStages}
          className={`text-[9.5px] font-mono px-2 py-1 rounded-full border transition ${
            showStages
              ? "text-cyan-300 bg-cyan-500/10 border-cyan-500/25"
              : "text-zinc-600 border-zinc-800/70"
          }`}
        >
          stage edges
        </button>
      </div>
    </div>
  );
}
