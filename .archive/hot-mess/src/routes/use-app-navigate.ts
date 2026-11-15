import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { appState } from "@/hooks/use-app-state";
import { pathFor, routeById } from "./registry";
import { buildRoutePath, currentScope, missingScope, stageEntryRoute, type TransitionDef } from "./route-kit";

export type GoOptions = {
  params?: Record<string, string | undefined>;
  replace?: boolean;
  /** Router state passed to the destination. */
  state?: unknown;
};

/** The only sanctioned way to navigate. Every call names a declared transition. */
export function useAppNavigate() {
  const navigate = useNavigate();

  const go = useCallback(
    (transition: TransitionDef, opts: GoOptions = {}) => {
      const target = routeById(transition.to);
      const missing = missingScope(target, currentScope(appState));
      if (missing.length > 0) {
        console.error(
          `[nav] blocked transition to "${target.id}" (${transition.trigger}) — missing scope: ${missing.join(", ")}`,
        );
        navigate(pathFor(stageEntryRoute(appState.appStage)), { replace: true });
        return;
      }
      navigate(buildRoutePath(target, opts.params), { replace: opts.replace, state: opts.state });
    },
    [navigate],
  );

  /** History back (for explicit back buttons). Gatekeeper still applies at mount. */
  const goBack = useCallback(() => navigate(-1), [navigate]);

  return { go, goBack };
}
