import { proxy } from "valtio";

/**
 * Mirrors the shape of the host app's stage machine (kalaido uses more stages;
 * the fixture keeps the three needed to exercise the gatekeeper: a boot stage,
 * a "nothing open" stage, and an open-workspace stage that satisfies the
 * "kalaidoscope" scope).
 */
export type AppStage =
  | { stage: "bootstrap" }
  | { stage: "no_kalaidoscopes_available" }
  | { stage: "kalaidoscope_open"; selectedKalaidoscopeId: string };

export type AppState = {
  appStage: AppStage;
};

export const appState = proxy<AppState>({
  appStage: { stage: "bootstrap" },
});
