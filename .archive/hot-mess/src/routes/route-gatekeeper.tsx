import { useState, type ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useSnapshot } from "valtio/react";
import { appState, type AppStage } from "@/hooks/use-app-state";
import { KalaidoscopeClientContext } from "@/hooks/use-kalaidoscope-client";
import { createMockClient } from "@/testing/mock-client";
import { DEFAULT_FIXTURES } from "@/testing/fixtures";
import { pathFor } from "./registry";
import { currentScope, missingScope, stageEntryRoute, type RouteDef } from "./route-kit";

/**
 * Mount-time scope enforcement. This is the guarantee that makes the canvas
 * trustworthy: no matter how a navigation happened (transition, deep link,
 * back button), a page whose requiredScope is unmet cannot render — the user
 * is redirected to the entry route for the current stage.
 */
export function RouteGatekeeper({ def }: { def: RouteDef }) {
  const snap = useSnapshot(appState);
  const missing = missingScope(def, currentScope({ appStage: snap.appStage as AppStage }));

  if (missing.length > 0) {
    console.warn(`[gatekeeper] blocked "${def.id}" — missing scope: ${missing.join(", ")}`);
    return <Navigate to={pathFor(stageEntryRoute(snap.appStage as AppStage))} replace />;
  }

  const Page = def.Component;

  if (def.requiredScope.includes("kalaidoscope") && snap.appStage.stage === "kalaidoscope_open") {
    return (
      <WorkspaceContainer key={snap.appStage.selectedKalaidoscopeId}>
        <Page />
      </WorkspaceContainer>
    );
  }
  return <Page />;
}

/**
 * The fixture analogue of kalaido's KalaidoscopeContainer: scoped routes get a
 * data client via context, and only scoped routes — pages calling
 * useKalaidoscopeClient() outside it throw, exactly like the host app.
 * The small delay makes loading states real in the running app.
 */
function WorkspaceContainer({ children }: { children: ReactNode }) {
  const [client] = useState(() => createMockClient({ fixtures: DEFAULT_FIXTURES, delay: 400 }));
  return (
    <KalaidoscopeClientContext.Provider value={client}>
      {children}
    </KalaidoscopeClientContext.Provider>
  );
}
