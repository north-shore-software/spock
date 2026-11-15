import { Activity, Layers, Cpu, ArrowLeft, BarChart3, Radio, LayoutGrid } from "lucide-react";
import { signOut } from "@/hooks/app-state-actions";
import { defineRoute } from "@/routes/route-kit";
import { RouteLink } from "@/routes/route-link";
import { useAppNavigate } from "@/routes/use-app-navigate";
import { AppNav } from "@/chrome/app-nav";
import { mainTransitions } from "./Main.transitions";

export function Main() {
  const { go } = useAppNavigate();

  const exitWorkspace = () => {
    // Dropping the scope first exercises the gatekeeper: after signOut() every
    // scoped route (including this one) redirects to the stage entry route.
    signOut();
    go(mainTransitions.signOut);
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Glow */}
      <div className="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-500/5 rounded-full blur-[150px] pointer-events-none" />

      {/* Top Navigation */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-mono font-bold text-sm">
            MM
          </div>
          <span className="font-bold tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
            MindMeld Studio
          </span>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            DEMO
          </span>
        </div>

        <button
          onClick={exitWorkspace}
          className="inline-flex items-center space-x-1.5 text-xs text-zinc-400 hover:text-white transition duration-150"
        >
          <ArrowLeft size={14} />
          <span>Exit Workspace</span>
        </button>
      </header>

      {/* Main Grid Workspace */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6 md:p-8 space-y-8 pb-24">
        {/* Banner Section */}
        <section className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800/80 p-8 rounded-2xl relative overflow-hidden shadow-xl">
          <div className="absolute right-0 bottom-0 top-0 w-1/3 bg-[radial-gradient(circle_at_bottom_right,rgba(99,102,241,0.08),transparent_70%)]" />
          <div className="max-w-xl space-y-3 relative z-10">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">System Status: fully operational</h2>
            <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
              Welcome back. The standalone sandbox environment has initialized the workspace client, Valtio state, and mock database collections successfully.
            </p>
          </div>
        </section>

        {/* Dashboard Panels */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Stream Explorer Card */}
          <div className="group relative bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 hover:border-indigo-500/40 p-6 rounded-2xl shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center">
                <Radio size={20} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold group-hover:text-indigo-400 transition-colors">Stream Drawer Explorer</h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  Analyze streamed database collections, active mock fragments, and detail drawers with nested routes.
                </p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Feature: Fragments</span>
              <RouteLink
                transition={mainTransitions.openStream}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 inline-flex items-center space-x-1"
              >
                <span>Launch Stream</span>
                <span>→</span>
              </RouteLink>
            </div>
          </div>

          {/* Projections Detail Card */}
          <div className="group relative bg-zinc-950/50 backdrop-blur-sm border border-zinc-800 hover:border-purple-500/40 p-6 rounded-2xl shadow-lg transition-all duration-300 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
                <Layers size={20} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-lg font-bold group-hover:text-purple-400 transition-colors">Projections Controller</h3>
                <p className="text-zinc-400 text-xs md:text-sm leading-relaxed">
                  Monitor live projection worker streams, pipeline status lists, and view extracted state definitions.
                </p>
              </div>
            </div>
            <div className="mt-8 pt-4 border-t border-zinc-900 flex items-center justify-between">
              <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider">Feature: Projections</span>
              <RouteLink
                transition={mainTransitions.openProjections}
                className="text-xs font-semibold text-purple-400 hover:text-purple-300 inline-flex items-center space-x-1"
              >
                <span>View Projections</span>
                <span>→</span>
              </RouteLink>
            </div>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4">
          <div className="bg-zinc-950/30 border border-zinc-800/60 p-4 rounded-xl flex items-center space-x-3">
            <Cpu size={16} className="text-zinc-500" />
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Server CPU</div>
              <div className="text-sm font-semibold">0.05% load</div>
            </div>
          </div>
          <div className="bg-zinc-950/30 border border-zinc-800/60 p-4 rounded-xl flex items-center space-x-3">
            <Activity size={16} className="text-zinc-500" />
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Vite HMR</div>
              <div className="text-sm font-semibold">Active</div>
            </div>
          </div>
          <div className="bg-zinc-950/30 border border-zinc-800/60 p-4 rounded-xl flex items-center space-x-3">
            <LayoutGrid size={16} className="text-zinc-500" />
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Routes Extracted</div>
              <div className="text-sm font-semibold">6 registered</div>
            </div>
          </div>
          <div className="bg-zinc-950/30 border border-zinc-800/60 p-4 rounded-xl flex items-center space-x-3">
            <BarChart3 size={16} className="text-zinc-500" />
            <div>
              <div className="text-[10px] font-mono text-zinc-500 uppercase">Database Sync</div>
              <div className="text-sm font-semibold">Mock Proxy</div>
            </div>
          </div>
        </div>
      </main>

      <AppNav />
    </div>
  );
}
export default Main;

export const mainRoute = defineRoute({
  id: "main",
  path: "/main",
  feature: "Dashboard",
  requiredScope: ["kalaidoscope"],
  transitions: mainTransitions,
  Component: Main,
});
