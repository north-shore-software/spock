import { useState } from "react";
import { createPortal } from "react-dom";
import { useParams } from "react-router-dom";
import { ArrowLeft, Camera, CheckCircle2, History, Layers, TriangleAlert } from "lucide-react";
import { useRecord } from "@/hooks/use-collection";
import { defineRoute } from "@/routes/route-kit";
import { RouteLink } from "@/routes/route-link";
import { AppNav } from "@/chrome/app-nav";
import { projectionDetailTransitions } from "./ProjectionDetail.transitions";

export function ProjectionDetail() {
  const { id, snapshotId } = useParams<{ id: string; snapshotId?: string }>();
  const { record: projection, isLoading, error } = useRecord("projections", id);

  // Read-only mode is URL-driven: the snapshot alias carries a snapshotId.
  const readOnly = !!snapshotId;

  // The approve dialog is data-driven: a projection in "Review" prompts for
  // approval on entry (dismissable). Rendered through a portal to document.body
  // — the export pipeline must capture it even though it's outside the page tree.
  const [dismissed, setDismissed] = useState(false);
  const confirmOpen = !dismissed && !readOnly && projection?.status === "Review";

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Glow */}
      <div className="absolute top-1/4 left-1/3 w-[350px] h-[350px] bg-emerald-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center space-x-3">
        <RouteLink
          transition={projectionDetailTransitions.backToList}
          className="p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
        </RouteLink>
        <div className="flex items-center space-x-2">
          <Layers size={18} className="text-emerald-400" />
          <span className="font-bold tracking-tight text-sm">
            {projection ? projection.title : "Projection"}
          </span>
        </div>
        {readOnly && (
          <span className="text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
            Snapshot {snapshotId}
          </span>
        )}
      </header>

      {/* Snapshot banner */}
      {readOnly && (
        <div className="bg-amber-500/5 border-b border-amber-500/15 px-6 py-2.5 flex items-center justify-between">
          <div className="flex items-center space-x-2 text-xs text-amber-300">
            <History size={13} />
            <span>Read-only historical snapshot. Changes are disabled.</span>
          </div>
          <RouteLink
            transition={projectionDetailTransitions.backToLive}
            params={{ id }}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 transition"
          >
            Back to live →
          </RouteLink>
        </div>
      )}

      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 space-y-6 pb-24">
        {error ? (
          <div className="max-w-md border border-rose-500/20 bg-rose-500/5 p-6 rounded-2xl flex items-start space-x-4">
            <TriangleAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h3 className="font-semibold text-sm text-rose-300">Projection unavailable</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">{error.message}</p>
            </div>
          </div>
        ) : isLoading || !projection ? (
          <div className="space-y-4" aria-label="loading">
            <div className="bg-zinc-950/40 border border-zinc-800/80 p-6 rounded-xl space-y-3 animate-pulse">
              <div className="h-5 w-1/2 bg-zinc-900 rounded" />
              <div className="h-3 w-full bg-zinc-900 rounded" />
              <div className="h-3 w-2/3 bg-zinc-900 rounded" />
            </div>
          </div>
        ) : (
          <>
            <section className="bg-zinc-950/40 border border-zinc-800/80 p-6 rounded-2xl space-y-4">
              <div className="flex items-center justify-between">
                <h1 className="text-lg font-bold">{projection.title}</h1>
                <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
                  {projection.status}
                </span>
              </div>
              <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">{projection.summary}</p>
              <div className="text-[10px] font-mono text-zinc-600">
                Updated {projection.updated.slice(0, 10)} · viewing {readOnly ? `snapshot ${snapshotId}` : "live"}
              </div>
            </section>

            <section className="space-y-3">
              <h2 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Snapshots</h2>
              {projection.snapshotIds.length === 0 ? (
                <p className="text-xs text-zinc-500">No snapshots recorded for this projection.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {projection.snapshotIds.map((sid) => (
                    <RouteLink
                      key={sid}
                      transition={projectionDetailTransitions.viewSnapshot}
                      params={{ id: projection.id, snapshotId: sid }}
                      className={`inline-flex items-center space-x-1.5 text-[11px] font-mono px-2.5 py-1.5 rounded-lg border transition ${
                        sid === snapshotId
                          ? "bg-amber-500/10 text-amber-300 border-amber-500/25"
                          : "bg-zinc-950/40 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
                      }`}
                    >
                      <Camera size={11} />
                      <span>{sid}</span>
                    </RouteLink>
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </main>

      {/* Approve dialog — portalled to document.body like a real modal library */}
      {confirmOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-zinc-950/70 backdrop-blur-sm p-6">
            <div className="max-w-sm w-full bg-zinc-950 border border-zinc-800 rounded-2xl p-6 space-y-5 shadow-2xl">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
                  <CheckCircle2 size={18} />
                </div>
                <div>
                  <h3 className="font-bold text-sm">Pending draft awaits approval</h3>
                  <p className="text-[11px] text-zinc-500 font-mono">status: Review</p>
                </div>
              </div>
              <p className="text-zinc-400 text-xs leading-relaxed">
                This projection has a draft in review. Approve it to promote the draft to the live
                snapshot, or dismiss to keep reviewing.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent hover:border-zinc-800 transition"
                >
                  Keep reviewing
                </button>
                <button
                  onClick={() => setDismissed(true)}
                  className="px-3.5 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-amber-400 hover:bg-amber-300 active:scale-95 transition-all shadow-md"
                >
                  Approve draft
                </button>
              </div>
            </div>
          </div>,
          document.body,
        )}

      <AppNav />
    </div>
  );
}
export default ProjectionDetail;

export const projectionDetailRoute = defineRoute({
  id: "projection-detail",
  path: "/projections/:id",
  aliases: ["/projections/:id/snapshot/:snapshotId"],
  feature: "Projections",
  requiredScope: ["kalaidoscope"],
  transitions: projectionDetailTransitions,
  Component: ProjectionDetail,
});
