import { createContext, useContext } from "react";
import type { EdgeProps } from "@xyflow/react";
import { BaseEdge, EdgeLabelRenderer, getBezierPath } from "@xyflow/react";
import type { TransitionEdgeData } from "./layout";

export type TooltipPayload = {
  x: number;
  y: number;
  data: TransitionEdgeData;
  targetId: string;
};

/** The canvas root renders one fixed-position tooltip; edges feed it here. */
export const EdgeTooltipContext = createContext<{
  show: (payload: TooltipPayload) => void;
  hide: () => void;
}>({ show: () => {}, hide: () => {} });

const KIND_COLOR: Record<TransitionEdgeData["kind"], string> = {
  page: "#6366f1",
  chrome: "#a855f7",
  stage: "#06b6d4",
};

const truncate = (s: string, n = 26) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

export function TransitionEdge({
  id,
  source,
  target,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps) {
  const tooltip = useContext(EdgeTooltipContext);
  const edgeData = data as TransitionEdgeData;
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const color = KIND_COLOR[edgeData.kind];

  const show = (e: React.MouseEvent) =>
    tooltip.show({ x: e.clientX, y: e.clientY, data: edgeData, targetId: target });

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        style={{
          stroke: color,
          strokeWidth: selected ? 2.5 : 1.5,
          opacity: selected ? 1 : 0.75,
          strokeDasharray: edgeData.kind === "stage" ? "6 4" : undefined,
        }}
      />
      <EdgeLabelRenderer>
        <div
          data-edge-source={source}
          style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
          className="absolute pointer-events-auto nodrag nopan"
          onMouseEnter={show}
          onMouseMove={show}
          onMouseLeave={tooltip.hide}
        >
          <span
            style={{ borderColor: `${color}55`, color }}
            className={`inline-block max-w-[190px] truncate text-[9.5px] font-medium bg-[#0c0c0e] border px-2 py-0.5 rounded-full shadow-md ${
              selected ? "ring-1 ring-current" : ""
            }`}
          >
            {truncate(edgeData.transition.trigger)}
          </span>
        </div>
      </EdgeLabelRenderer>
    </>
  );
}

/** The single fixed tooltip; rendered by the canvas root, above the flow pane. */
export function EdgeTooltip({ payload }: { payload: TooltipPayload | null }) {
  if (!payload) return null;
  const { data, targetId } = payload;
  const t = data.transition;

  // Keep the tooltip on-screen: flip when near the right/bottom edge.
  const flipX = payload.x > window.innerWidth - 320;
  const flipY = payload.y > window.innerHeight - 220;

  return (
    <div
      style={{
        position: "fixed",
        left: payload.x + (flipX ? -14 : 14),
        top: payload.y + (flipY ? -14 : 14),
        transform: `translate(${flipX ? "-100%" : "0"}, ${flipY ? "-100%" : "0"})`,
        zIndex: 1000,
      }}
      className="pointer-events-none max-w-[300px] bg-[#0b0b0d]/95 border border-zinc-700 rounded-xl p-3.5 shadow-2xl space-y-2"
    >
      <div className="text-[12px] font-semibold text-zinc-100 leading-snug">{t.trigger}</div>
      <div className="text-[10px] font-mono text-zinc-500">
        {data.sourceLabel} → {targetId}
      </div>
      <div className="space-y-1 pt-1 border-t border-zinc-800/80">
        <TooltipRow label="Requires">
          {data.targetScope.length ? data.targetScope.join(", ") : "nothing"}
        </TooltipRow>
        {t.when && <TooltipRow label="When">{t.when}</TooltipRow>}
        {t.animation && <TooltipRow label="Animation">{t.animation}</TooltipRow>}
      </div>
    </div>
  );
}

function TooltipRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline text-[10px] leading-relaxed">
      <span className="w-16 shrink-0 font-mono uppercase tracking-wider text-zinc-600">{label}</span>
      <span className="text-zinc-300">{children}</span>
    </div>
  );
}
