import { ArrowLeft, Cpu, Inbox, Zap } from "lucide-react";
import { useCollection } from "@/hooks/use-collection";
import { defineRoute } from "@/routes/route-kit";
import { RouteLink } from "@/routes/route-link";
import { AppNav } from "@/chrome/app-nav";
import { projectionsTransitions } from "./Projections.transitions";

const STATUS_STYLES: Record<string, string> = {
  Active: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  Draft: "bg-zinc-500/10 text-zinc-400 border-zinc-500/20",
  Review: "bg-amber-500/10 text-amber-400 border-amber-500/20",
};

export function Projections() {
  const { data, isLoading } = useCollection("projections");

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Glow */}
      <div className="absolute top-1/4 right-1/4 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RouteLink
            transition={projectionsTransitions.backToDashboard}
            className="p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
          </RouteLink>
          <div className="flex items-center space-x-2">
            <Cpu size={18} className="text-emerald-400" />
            <span className="font-bold tracking-tight text-sm">Projection Workers</span>
          </div>
        </div>
        <span className="text-xs font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/10 px-2 py-1 rounded">
          {isLoading ? "…" : `${data.length} workers`}
        </span>
      </header>

      {/* Worker list */}
      <main className="flex-1 max-w-4xl w-full mx-auto p-6 md:p-8 space-y-4 pb-24">
        {isLoading ? (
          <div className="space-y-4" aria-label="loading">
            {[0, 1, 2].map((i) => (
              <div key={i} className="bg-zinc-950/40 border border-zinc-800/80 p-5 rounded-xl space-y-3 animate-pulse">
                <div className="h-4 w-1/3 bg-zinc-900 rounded" />
                <div className="h-3 w-2/3 bg-zinc-900 rounded" />
              </div>
            ))}
          </div>
        ) : data.length === 0 ? (
          <div className="max-w-md w-full text-center border border-zinc-800 bg-zinc-950/40 p-8 rounded-2xl flex flex-col items-center space-y-4 shadow-xl mx-auto mt-8">
            <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-500">
              <Inbox size={24} />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold">No projection workers</h1>
              <p className="text-zinc-400 text-xs md:text-sm">
                No workers are registered in this workspace yet.
              </p>
            </div>
          </div>
        ) : (
          data.map((p) => (
            <RouteLink
              key={p.id}
              transition={projectionsTransitions.openDetail}
              params={{ id: p.id }}
              className="group block bg-zinc-950/40 border border-zinc-800/80 hover:border-emerald-500/30 p-5 rounded-xl shadow-lg transition duration-200"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <Zap size={16} className="text-emerald-400" />
                  <h3 className="font-semibold text-sm group-hover:text-emerald-400 transition-colors">{p.title}</h3>
                </div>
                <span className={`text-[10px] font-mono border px-2 py-0.5 rounded uppercase tracking-wider ${STATUS_STYLES[p.status]}`}>
                  {p.status}
                </span>
              </div>
              <p className="mt-2 text-zinc-400 text-xs leading-relaxed">{p.summary}</p>
              <div className="mt-3 text-[10px] font-mono text-zinc-600">
                {p.snapshotIds.length} snapshot{p.snapshotIds.length === 1 ? "" : "s"} · updated {p.updated.slice(0, 10)}
              </div>
            </RouteLink>
          ))
        )}
      </main>

      <AppNav />
    </div>
  );
}
export default Projections;

export const projectionsRoute = defineRoute({
  id: "projections",
  path: "/projections",
  feature: "Projections",
  requiredScope: ["kalaidoscope"],
  transitions: projectionsTransitions,
  Component: Projections,
});
