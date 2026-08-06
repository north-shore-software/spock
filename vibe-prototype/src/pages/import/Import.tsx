import { useState } from "react";
import { ArrowLeft, CloudLightning, Download, FileJson, Link } from "lucide-react";
import { pickLocalSchema } from "@/api/native-bridge";
import { defineRoute } from "@/routes/route-kit";
import { RouteLink } from "@/routes/route-link";
import { AppNav } from "@/chrome/app-nav";
import { importTransitions } from "./Import.transitions";

export function Import() {
  const [pickedPath, setPickedPath] = useState<string | null>(null);

  const pickFile = async () => {
    // Goes through the app's native bridge (a real module-level Tauri import,
    // served by the stub via vite alias outside the desktop shell).
    setPickedPath(await pickLocalSchema());
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col font-sans">
      {/* Glow */}
      <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-purple-500/5 rounded-full blur-[100px] pointer-events-none" />

      {/* Top Header */}
      <header className="border-b border-zinc-800/80 bg-zinc-950/40 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex items-center space-x-3">
        <RouteLink
          transition={importTransitions.backToStream}
          className="p-1.5 rounded-lg hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white transition"
        >
          <ArrowLeft size={16} />
        </RouteLink>
        <span className="font-bold tracking-tight text-sm">Import Source Manager</span>
      </header>

      {/* Content Container */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-6 md:p-8 space-y-8 pb-24">
        <div className="space-y-2">
          <h1 className="text-xl font-bold">Connect Data Collection</h1>
          <p className="text-zinc-400 text-xs md:text-sm">
            Import JSON, connect to live collections, or sync with local files.
          </p>
        </div>

        {/* Sync panel options */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition cursor-pointer flex items-start space-x-4">
            <div className="p-2.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 mt-1">
              <Link size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm">PocketBase Remote</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Provide schema URLs to pull live streams from a PocketBase deployment.
              </p>
            </div>
          </div>

          <div className="bg-zinc-950/40 border border-zinc-800 p-5 rounded-xl hover:border-zinc-700 transition cursor-pointer flex items-start space-x-4">
            <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20 mt-1">
              <CloudLightning size={18} />
            </div>
            <div className="space-y-1.5">
              <h3 className="font-semibold text-sm">Live WebSocket Feed</h3>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Ingest real-time application mutations and streaming events.
              </p>
            </div>
          </div>
        </div>

        {/* Native file picker */}
        <button
          onClick={pickFile}
          className="w-full border-2 border-dashed border-zinc-800/80 bg-zinc-950/10 hover:bg-zinc-950/30 p-12 rounded-2xl flex flex-col items-center space-y-4 text-center transition cursor-pointer"
        >
          <div className="w-12 h-12 rounded-xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400">
            <Download size={22} />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold text-sm">Browse local schemas</h3>
            <p className="text-zinc-500 text-xs">Opens the OS file picker. Supports .json and .yaml.</p>
          </div>
          {pickedPath ? (
            <span className="inline-flex items-center space-x-1.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/5 border border-emerald-500/20 px-2 py-1 rounded">
              <FileJson size={11} />
              <span>{pickedPath}</span>
            </span>
          ) : (
            <span className="text-[10px] text-zinc-500 bg-zinc-900 px-2 py-1 rounded border border-zinc-800/60 uppercase">
              Max 50MB
            </span>
          )}
        </button>

        {/* Buttons */}
        <div className="flex items-center justify-end space-x-4 pt-4 border-t border-zinc-900">
          <RouteLink
            transition={importTransitions.backToStream}
            className="px-4 py-2 rounded-lg text-xs font-semibold hover:bg-zinc-900 border border-transparent hover:border-zinc-800 text-zinc-400 hover:text-white transition duration-150"
          >
            Cancel
          </RouteLink>
          <RouteLink
            transition={importTransitions.doneImporting}
            className="px-4 py-2 rounded-lg text-xs font-semibold text-zinc-950 bg-white hover:bg-zinc-200 active:scale-95 transition-all shadow-md"
          >
            Done Importing
          </RouteLink>
        </div>
      </main>

      <AppNav />
    </div>
  );
}
export default Import;

export const importRoute = defineRoute({
  id: "import",
  path: "/import",
  feature: "Fragments",
  requiredScope: ["kalaidoscope"],
  transitions: importTransitions,
  Component: Import,
});
