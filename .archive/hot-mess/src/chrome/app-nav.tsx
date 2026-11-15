import { useLocation } from "react-router-dom";
import { LayoutDashboard, Radio, Layers, Download } from "lucide-react";
import { RouteLink } from "@/routes/route-link";
import { pathFor } from "@/routes/registry";
import type { TransitionDef } from "@/routes/route-kit";
import { appNavTransitions } from "./app-nav.transitions";

const ITEMS: { label: string; transition: TransitionDef; Icon: typeof Radio }[] = [
  { label: "Dashboard", transition: appNavTransitions.transitions.openDashboard, Icon: LayoutDashboard },
  { label: "Stream", transition: appNavTransitions.transitions.openStream, Icon: Radio },
  { label: "Projections", transition: appNavTransitions.transitions.openProjections, Icon: Layers },
  { label: "Import", transition: appNavTransitions.transitions.openImport, Icon: Download },
];

/** Shared chrome: the floating workspace navigation pill. */
export function AppNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center space-x-1 bg-zinc-950/80 backdrop-blur-md border border-zinc-800 rounded-full px-2 py-1.5 shadow-2xl">
      {ITEMS.map(({ label, transition, Icon }) => {
        const active = location.pathname.startsWith(pathFor(transition.to));
        return (
          <RouteLink
            key={label}
            transition={transition}
            className={`inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition ${
              active
                ? "bg-indigo-500/15 text-indigo-300 border border-indigo-500/20"
                : "text-zinc-400 hover:text-white hover:bg-zinc-900 border border-transparent"
            }`}
          >
            <Icon size={12} />
            <span>{label}</span>
          </RouteLink>
        );
      })}
    </nav>
  );
}
