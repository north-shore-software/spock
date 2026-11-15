import { useParams } from "react-router-dom";
import { ArrowLeft, Inbox, Radio, Sparkles, Terminal, TriangleAlert } from "lucide-react";
import { useCollection } from "@/hooks/use-collection";
import { defineRoute } from "@/routes/route-kit";
import { RouteLink } from "@/routes/route-link";
import { AppNav } from "@/chrome/app-nav";
import { streamTransitions } from "./Stream.transitions";

export function Stream() {
  const { id: selectedId } = useParams<{ id?: string }>();
  const { data, isLoading, error } = useCollection("view_stream");
  const selected = selectedId ? data.find((f) => f.id === selectedId) : undefined;

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Glow */}
      <div className="absolute top-12 left-1/4 w-[350px] h-[350px] bg-indigo-500/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <RouteLink
            transition={streamTransitions.backToDashboard}
            className="p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white transition"
          >
            <ArrowLeft size={16} />
          </RouteLink>
          <div className="flex items-center space-x-2">
            <Radio size={18} className="text-indigo-400 animate-pulse" />
            <span className="font-bold tracking-tight text-sm">Stream Ingest Terminal</span>
          </div>
        </div>
        <span className="text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded uppercase tracking-wider">
          Streaming // {isLoading ? "SYNCING" : "ACTIVE"}
        </span>
      </header>

      {/* Main Content Layout */}
      <div className="flex-1 flex flex-col md:flex-row relative pb-20">
        <div className="flex-1 p-6 md:p-8 space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold">Streamed Fragments</h2>
              <p className="text-zinc-500 text-xs">Workspace collection payloads, newest first</p>
            </div>
            <span className="text-xs font-mono text-indigo-400 bg-indigo-500/5 border border-indigo-500/10 px-2 py-1 rounded">
              {isLoading ? "…" : `${data.length} records`}
            </span>
          </div>

          {error ? (
            <div className="max-w-md border border-rose-500/20 bg-rose-500/5 p-6 rounded-2xl flex items-start space-x-4">
              <TriangleAlert size={20} className="text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <h3 className="font-semibold text-sm text-rose-300">Stream unavailable</h3>
                <p className="text-zinc-400 text-xs leading-relaxed">{error.message}</p>
              </div>
            </div>
          ) : isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" aria-label="loading">
              {[0, 1, 2, 3].map((i) => (
                <div key={i} className="bg-zinc-950/40 border border-zinc-800/80 p-5 rounded-xl space-y-3 animate-pulse">
                  <div className="h-3 w-16 bg-zinc-900 rounded" />
                  <div className="h-4 w-3/4 bg-zinc-900 rounded" />
                  <div className="h-3 w-full bg-zinc-900 rounded" />
                  <div className="h-3 w-2/3 bg-zinc-900 rounded" />
                </div>
              ))}
            </div>
          ) : data.length === 0 ? (
            <div className="max-w-md w-full text-center border border-zinc-800 bg-zinc-950/40 p-8 rounded-2xl flex flex-col items-center space-y-6 shadow-xl mx-auto mt-8">
              <div className="w-12 h-12 rounded-full bg-zinc-900/80 border border-zinc-800 flex items-center justify-center text-zinc-500">
                <Inbox size={24} />
              </div>
              <div className="space-y-2">
                <h1 className="text-xl font-bold">No active streams</h1>
                <p className="text-zinc-400 text-xs md:text-sm">
                  The streaming pipeline hasn't ingested any fragments yet. Connect to a source to begin.
                </p>
              </div>
              <RouteLink
                transition={streamTransitions.openImport}
                className="w-full inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-xs bg-indigo-600 hover:bg-indigo-500 text-white transition-all shadow-md active:scale-95"
              >
                Go to Import Source
              </RouteLink>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {data.map((item) => (
                <div
                  key={item.id}
                  className="group relative bg-zinc-950/40 border border-zinc-800/80 hover:border-indigo-500/30 p-5 rounded-xl shadow-lg transition duration-200 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-mono text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 rounded">
                        {item.id.toUpperCase()} · {item.time}
                      </span>
                      <Sparkles size={12} className="text-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                    <h3 className="font-semibold text-sm group-hover:text-indigo-400 transition-colors">{item.title}</h3>
                    <p className="text-zinc-400 text-xs leading-relaxed">{item.content}</p>
                  </div>

                  <div className="mt-6 pt-4 border-t border-zinc-900/60 flex items-center justify-end">
                    <RouteLink
                      transition={streamTransitions.openFragment}
                      params={{ id: item.id }}
                      className="text-[11px] font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1"
                    >
                      <span>Inspect Payload</span>
                      <span>→</span>
                    </RouteLink>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Fragment drawer — open iff the URL carries an id (/stream/:id) */}
        {selectedId && (
          <aside className="w-full md:w-[380px] border-t md:border-t-0 md:border-l border-zinc-800 bg-zinc-950/60 backdrop-blur-xl p-6 md:p-8 space-y-6 flex flex-col justify-between relative shadow-2xl z-40">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Terminal size={14} className="text-indigo-400" />
                  <span className="text-xs font-mono text-zinc-400 tracking-wider">FRAGMENT_DRAWER</span>
                </div>
                <RouteLink
                  transition={streamTransitions.closeFragment}
                  className="text-xs text-rose-400 hover:text-rose-300 transition"
                >
                  Close
                </RouteLink>
              </div>

              {selected ? (
                <>
                  <div className="space-y-2 pt-4">
                    <h3 className="text-base font-bold text-zinc-100">{selected.title}</h3>
                    <div className="p-3.5 rounded-lg bg-zinc-900 border border-zinc-800 font-mono text-xs text-indigo-300 space-y-1.5">
                      <div>ID: {selected.id}</div>
                      <div>Kind: {selected.kind}</div>
                      <div>Time: {selected.time}</div>
                      <div>Scope: "kalaidoscope"</div>
                    </div>
                  </div>
                  <div className="space-y-2 pt-4">
                    <h4 className="text-xs font-semibold text-zinc-400">Payload</h4>
                    <p className="text-zinc-500 text-xs leading-relaxed">{selected.content}</p>
                  </div>
                </>
              ) : (
                <div className="pt-4 text-xs text-zinc-500">
                  {isLoading ? "Loading fragment…" : `No fragment "${selectedId}" in this stream.`}
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-zinc-900 text-[10px] font-mono text-zinc-600 uppercase tracking-wider">
              Drawer state is URL-driven: /stream/{selectedId}
            </div>
          </aside>
        )}
      </div>

      <AppNav />
    </div>
  );
}
export default Stream;

export const streamRoute = defineRoute({
  id: "stream",
  path: "/stream/:id?",
  feature: "Fragments",
  requiredScope: ["kalaidoscope"],
  transitions: streamTransitions,
  Component: Stream,
});
