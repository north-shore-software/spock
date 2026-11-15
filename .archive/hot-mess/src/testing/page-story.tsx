import { useEffect, useState, type ReactNode } from "react";
import { Route, Routes, useNavigate } from "react-router-dom";
import { KalaidoscopeClientContext } from "@/hooks/use-kalaidoscope-client";
import { appState, type AppStage } from "@/hooks/use-app-state";
import type { RouteDef } from "@/routes/route-kit";
import { createMockClient, type MockClientOptions } from "./mock-client";
import { DEFAULT_FIXTURES } from "./fixtures";

export type PageStoryProps = {
  route: RouteDef;
  /** Concrete URL to render, e.g. "/stream/frag-1". Defaults to route.path if param-free. */
  url?: string;
  /** App stage for the story. Defaults to an open workspace. */
  stage?: AppStage;
  /** Client behaviour. Defaults to DEFAULT_FIXTURES resolved immediately. */
  client?: MockClientOptions;
  children?: ReactNode;
};

const DEFAULT_STAGE: AppStage = { stage: "kalaidoscope_open", selectedKalaidoscopeId: "ks-demo" };

/**
 * Harness for page stories. Rides inside the Ladle global provider's
 * MemoryRouter (never nests a second router): it navigates to `url` on mount
 * and mounts the route's real path + aliases so useParams works.
 */
export function PageStory({ route, url, stage = DEFAULT_STAGE, client, children }: PageStoryProps) {
  // Set global stage synchronously, once, before the page first renders.
  useState(() => {
    appState.appStage = stage;
    return null;
  });
  const [mockClient] = useState(() =>
    createMockClient(client ?? { fixtures: DEFAULT_FIXTURES }),
  );

  const target = url ?? route.path;
  if (/[:*]/.test(target)) {
    throw new Error(`PageStory: route "${route.id}" has params — pass a concrete \`url\`.`);
  }

  const Page = route.Component;
  const element = (
    <KalaidoscopeClientContext.Provider value={mockClient}>
      {children ?? null}
      <Page />
    </KalaidoscopeClientContext.Provider>
  );

  return (
    <>
      <NavigateOnMount to={target} />
      <Routes>
        {[route.path, ...(route.aliases ?? [])].map((p) => (
          <Route key={p} path={p} element={element} />
        ))}
      </Routes>
    </>
  );
}

function NavigateOnMount({ to }: { to: string }) {
  const navigate = useNavigate();
  useEffect(() => {
    navigate(to, { replace: true });
  }, [navigate, to]);
  return null;
}
