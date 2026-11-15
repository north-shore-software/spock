import React from "react";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { getAppRoutes } from "./routes/registry";
import { RouteGatekeeper } from "./routes/route-gatekeeper";
import "./index.css";

// The canvas is tooling, not a screen of the fixture app: it mounts outside
// the route registry so it never appears in the extracted flow map.
const CanvasRoute = React.lazy(() =>
  import("./canvas/canvas-route").then((m) => ({ default: m.CanvasRoute })),
);

const router = createBrowserRouter([
  ...getAppRoutes().flatMap((def) =>
    [def.path, ...(def.aliases ?? [])].map((path) => ({
      path,
      element: <RouteGatekeeper def={def} />,
    })),
  ),
  {
    path: "/canvas",
    element: (
      <React.Suspense
        fallback={
          <div className="bg-[#09090b] min-h-screen text-zinc-500 flex items-center justify-center font-mono text-xs">
            Loading canvas…
          </div>
        }
      >
        <CanvasRoute />
      </React.Suspense>
    ),
  },
]);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <RouterProvider router={router} />
  </React.StrictMode>,
);
