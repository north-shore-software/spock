import { appState } from "./use-app-state";

export function openKalaidoscope(id: string) {
  appState.appStage = { stage: "kalaidoscope_open", selectedKalaidoscopeId: id };
}

export function signOut() {
  appState.appStage = { stage: "no_kalaidoscopes_available" };
}
