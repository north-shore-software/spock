import { openKalaidoscope } from "@/hooks/app-state-actions";
import { defineRoute } from "@/routes/route-kit";
import { useAppNavigate } from "@/routes/use-app-navigate";
import { splashTransitions } from "./Splash.transitions";

export function Splash() {
  const { go } = useAppNavigate();

  const enter = () => {
    // Opening the workspace grants the "kalaidoscope" scope, then the declared
    // transition navigates — same order the host app uses when booting a scope.
    openKalaidoscope("ks-demo");
    go(splashTransitions.enterApp);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#09090b] text-white p-6 selection:bg-[#c084fc] selection:text-[#09090b]">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 w-[300px] h-[300px] bg-purple-500/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-2xl w-full text-center border border-zinc-800/80 bg-zinc-950/60 backdrop-blur-xl p-12 rounded-2xl shadow-2xl shadow-indigo-950/20">
        {/* Terminal Header */}
        <div className="absolute top-4 left-6 flex space-x-2">
          <div className="w-3 h-3 rounded-full bg-rose-500/80" />
          <div className="w-3 h-3 rounded-full bg-amber-500/80" />
          <div className="w-3 h-3 rounded-full bg-emerald-500/80" />
        </div>
        <div className="absolute top-3.5 right-6 text-[10px] font-mono text-zinc-500 tracking-widest select-none">
          MINDMELD // STABLE_V1.0
        </div>

        {/* Branding Logo & Title */}
        <div className="mt-4 mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 p-[1px] mb-6 shadow-lg shadow-purple-500/20">
            <div className="w-full h-full rounded-[11px] bg-zinc-950 flex items-center justify-center font-mono font-extrabold text-2xl tracking-tighter bg-gradient-to-tr from-indigo-400 to-pink-400 bg-clip-text text-transparent">
              MM
            </div>
          </div>
          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight font-sans">
            Welcome to{" "}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              MindMeld
            </span>
          </h1>
          <p className="mt-4 text-zinc-400 text-sm sm:text-base font-medium max-w-md mx-auto leading-relaxed">
            The next-generation standalone environment for canvas-driven UX transition flows and static storybook extraction.
          </p>
        </div>

        {/* CTA Enter Button */}
        <div className="mt-8 flex flex-col items-center justify-center">
          <button
            onClick={enter}
            className="inline-flex items-center justify-center px-8 py-3.5 font-sans font-semibold text-sm text-zinc-950 bg-white rounded-xl shadow-lg hover:bg-zinc-200 active:scale-95 transition-all duration-200 border border-zinc-200"
          >
            Launch Core Terminal
          </button>
          <div className="mt-4 font-mono text-[10px] text-zinc-500 uppercase tracking-widest">
            Press enter to initialize connection
          </div>
        </div>
      </div>
    </div>
  );
}
export default Splash;

export const splashRoute = defineRoute({
  id: "splash",
  path: "/splash",
  aliases: ["/"],
  feature: "Onboarding",
  requiredScope: [],
  transitions: splashTransitions,
  Component: Splash,
});
