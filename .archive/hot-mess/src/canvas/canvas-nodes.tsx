import { useState } from "react";
import type { NodeProps } from "@xyflow/react";
import { Handle, Position } from "@xyflow/react";
import { Camera, ImageOff, Layers, MousePointerClick, Repeat2 } from "lucide-react";
import type { FlowMapStageEntry } from "../../scripts/lib/flow-map-schema";
import { HEADER_H, MINI_IMG_H, PAD, type PageNodeData } from "./layout";

function StoryImage({
  storyId,
  imgH,
  className = "",
}: {
  storyId: string;
  imgH: number;
  className?: string;
}) {
  const [broken, setBroken] = useState(false);

  if (broken) {
    return (
      <div
        style={{ height: imgH }}
        className={`flex items-center justify-center bg-zinc-900/60 border border-zinc-800 rounded-md text-zinc-600 ${className}`}
      >
        <ImageOff size={16} />
      </div>
    );
  }
  return (
    <div className={`relative group overflow-hidden rounded-md border border-zinc-800 nodrag ${className}`}>
      <img
        src={`/screenshots/${storyId}.png`}
        alt={storyId}
        loading="lazy"
        style={{ height: imgH, width: "100%", objectFit: "cover", objectPosition: "top" }}
        className="cursor-pointer block"
        onError={() => setBroken(true)}
        onClick={(e) => {
          e.stopPropagation();
          window.open(`/static/${storyId}.html`, "_blank");
        }}
      />
      <div className="absolute inset-0 bg-zinc-950/50 opacity-0 group-hover:opacity-100 flex items-center justify-center pointer-events-none transition duration-150">
        <span className="inline-flex items-center space-x-1 text-[10px] font-semibold text-white bg-zinc-900/95 border border-zinc-700 px-2 py-1 rounded shadow">
          <MousePointerClick size={10} />
          <span>open static render ↗</span>
        </span>
      </div>
    </div>
  );
}

export function PageNode({ data }: NodeProps) {
  const { route, card, highlighted } = data as PageNodeData;

  return (
    <div
      style={{ width: card.width, height: card.height, padding: PAD }}
      className={`bg-[#121214] border rounded-xl shadow-xl text-left transition-shadow ${
        highlighted ? "border-indigo-400 ring-2 ring-indigo-400/60" : "border-zinc-800"
      }`}
    >
      <Handle type="target" position={Position.Left} className="!bg-zinc-600 !border-zinc-800" />
      <Handle type="source" position={Position.Right} className="!bg-indigo-500 !border-zinc-800" />

      <div style={{ height: HEADER_H }} className="space-y-1 overflow-hidden">
        <div className="flex items-center justify-between gap-2">
          <span className="font-bold text-[13px] text-zinc-100 truncate">{route.id}</span>
          {card.selfTransitions.length > 0 && (
            <span
              title={card.selfTransitions.map((t) => t.trigger).join("\n")}
              className="inline-flex items-center space-x-1 text-[9px] font-mono text-zinc-400 bg-zinc-900 border border-zinc-800 px-1.5 py-0.5 rounded-full shrink-0"
            >
              <Repeat2 size={9} />
              <span>{card.selfTransitions.length} internal</span>
            </span>
          )}
        </div>
        <div className="text-[10px] font-mono text-zinc-500 truncate">
          {route.path}
          {route.aliases.length > 0 && <span className="text-zinc-700"> +{route.aliases.length} alias</span>}
        </div>
        <div className="flex items-center space-x-1">
          {route.requiredScope.length === 0 ? (
            <span className="text-[9px] font-mono text-zinc-600">no scope required</span>
          ) : (
            route.requiredScope.map((scope) => (
              <span
                key={scope}
                className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-px rounded"
              >
                {scope}
              </span>
            ))
          )}
        </div>
      </div>

      {card.primary ? (
        <StoryImage storyId={card.primary.storyId} imgH={card.primary.imgH} />
      ) : (
        <div className="h-[72px] flex flex-col items-center justify-center border-2 border-dashed border-zinc-800 rounded-md text-zinc-600 space-y-1">
          <Camera size={14} />
          <span className="text-[9px] font-mono uppercase tracking-wider">no stories yet</span>
        </div>
      )}

      {card.minis.length > 0 && (
        <div className="mt-1.5 grid grid-cols-3 gap-2">
          {card.minis.map((mini) => (
            <div key={mini.storyId}>
              <StoryImage storyId={mini.storyId} imgH={MINI_IMG_H} />
              <div className="mt-0.5 text-[8.5px] font-mono text-zinc-500 truncate text-center">{mini.name}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function SwimlaneNode({ data, width, height }: NodeProps) {
  return (
    <div
      style={{ width, height }}
      className="border border-dashed border-zinc-800 bg-zinc-100/[0.015] rounded-2xl"
    >
      <div className="px-4 pt-3 text-[11px] font-bold uppercase tracking-[0.15em] text-zinc-500">
        {String((data as { label: string }).label)}
      </div>
    </div>
  );
}

export function ChromeNode({ data, width, height }: NodeProps) {
  const { label } = data as { label: string };
  return (
    <div
      style={{ width, height }}
      className="bg-zinc-950 border border-purple-500/25 rounded-xl shadow-lg flex items-center px-4 space-x-3"
    >
      <Handle type="source" position={Position.Right} className="!bg-purple-500 !border-zinc-800" />
      <div className="w-8 h-8 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center shrink-0">
        <Layers size={14} />
      </div>
      <div className="min-w-0">
        <div className="text-[12px] font-bold text-zinc-100 truncate">{label}</div>
        <div className="text-[9px] font-mono text-zinc-500">chrome</div>
      </div>
    </div>
  );
}

export function StageNode({ data, width, height }: NodeProps) {
  const { stageEntries } = data as { stageEntries: FlowMapStageEntry[] };
  return (
    <div
      style={{ width, height }}
      className="bg-zinc-950 border border-cyan-500/25 rounded-xl shadow-lg px-4 py-3"
    >
      <Handle type="source" position={Position.Right} className="!bg-cyan-500 !border-zinc-800" />
      <div className="text-[12px] font-bold text-zinc-100">App stages</div>
      <div className="text-[9px] font-mono text-zinc-500 leading-relaxed">
        {stageEntries.length} stage entr{stageEntries.length === 1 ? "y" : "ies"} — where the app
        lands per stage
      </div>
    </div>
  );
}
