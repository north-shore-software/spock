import "./dom-prelude";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { AppStage } from "../src/hooks/use-app-state";
import type { ChromeTransitions, TransitionDef } from "../src/routes/route-kit";
import type {
  FlowMap,
  FlowMapChromeSource,
  FlowMapRoute,
  FlowMapStory,
  FlowMapTransition,
} from "./lib/flow-map-schema";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

/**
 * Every app stage, kept exhaustive BY THE COMPILER: adding a stage to
 * AppStage without updating this list (and stageEntryRoute) is a type error
 * here — the stage list can't silently go stale.
 */
const STAGES = ["bootstrap", "no_kalaidoscopes_available", "kalaidoscope_open"] as const satisfies readonly AppStage["stage"][];
type _AssertAllStagesCovered =
  Record<AppStage["stage"], true> extends Record<(typeof STAGES)[number], true> ? true : never;
const _allStagesCovered: _AssertAllStagesCovered = true;
void _allStagesCovered;

function toFlowTransitions(transitions: Record<string, TransitionDef>): FlowMapTransition[] {
  return Object.entries(transitions).map(([key, t]) => ({
    key,
    to: t.to,
    trigger: t.trigger,
    ...(t.when ? { when: t.when } : {}),
    ...(t.animation ? { animation: t.animation } : {}),
  }));
}

function isChromeTransitions(value: unknown): value is ChromeTransitions {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as ChromeTransitions).source === "string" &&
    (value as ChromeTransitions).source.startsWith("chrome:") &&
    typeof (value as ChromeTransitions).label === "string" &&
    typeof (value as ChromeTransitions).transitions === "object"
  );
}

async function main() {
  // Dynamic imports so the DOM prelude is installed first.
  const { getAppRoutes } = await import("../src/routes/registry");
  const { stageEntryRoute } = await import("../src/routes/route-kit");
  const appRoutes = getAppRoutes();

  // ---- Routes (the same objects the app runs on) ----
  const metaPath = path.join(ROOT, "build", "meta.json");
  const storiesMeta: Record<string, { name?: string }> = fs.existsSync(metaPath)
    ? JSON.parse(fs.readFileSync(metaPath, "utf-8")).stories
    : {};
  if (!fs.existsSync(metaPath)) {
    console.warn(`No ${metaPath} — routes will have empty stories. Run "pnpm ladle:build" first.`);
  }

  const routes: FlowMapRoute[] = appRoutes.map((def) => {
    const stories: FlowMapStory[] = Object.keys(storiesMeta)
      .filter((sid) => sid.startsWith(`pages--${def.id}--`))
      .map((sid) => ({
        storyId: sid,
        name: storiesMeta[sid].name ?? sid,
        isPrimary: sid.endsWith("--default"),
      }));
    if (stories.length > 0 && !stories.some((s) => s.isPrimary)) stories[0].isPrimary = true;
    stories.sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.storyId.localeCompare(b.storyId));

    return {
      id: def.id,
      path: def.path,
      aliases: def.aliases ?? [],
      feature: def.feature,
      requiredScope: def.requiredScope,
      transitions: toFlowTransitions(def.transitions),
      stories,
    };
  });
  routes.sort((a, b) => a.feature.localeCompare(b.feature) || a.id.localeCompare(b.id));

  // ---- Chrome transitions: discovered by convention (src/**/*.transitions.ts
  // exporting defineChromeTransitions values), no manifest to maintain. ----
  const chromeModules = import.meta.glob("../src/**/*.transitions.ts");
  const chrome: FlowMapChromeSource[] = [];
  for (const load of Object.values(chromeModules)) {
    const mod = (await load()) as Record<string, unknown>;
    for (const value of Object.values(mod)) {
      if (isChromeTransitions(value)) {
        chrome.push({
          source: value.source,
          label: value.label,
          transitions: toFlowTransitions(value.transitions),
        });
      }
    }
  }
  chrome.sort((a, b) => a.source.localeCompare(b.source));

  // ---- Stage entries (the same function the gatekeeper uses) ----
  const stageEntries = STAGES.map((stage) => ({
    stage,
    to: stageEntryRoute({ stage, selectedKalaidoscopeId: "extract" } as AppStage),
  }));

  // ---- Validate before writing: every target must resolve ----
  const routeIds = new Set(routes.map((r) => r.id));
  const errors: string[] = [];
  const checkTargets = (owner: string, transitions: FlowMapTransition[]) => {
    for (const t of transitions) {
      if (!routeIds.has(t.to)) errors.push(`${owner}: transition "${t.key}" targets unknown route "${t.to}"`);
      if (!t.trigger.trim()) errors.push(`${owner}: transition "${t.key}" has an empty trigger`);
    }
  };
  for (const r of routes) checkTargets(`route "${r.id}"`, r.transitions);
  for (const c of chrome) checkTargets(c.source, c.transitions);
  for (const s of stageEntries) {
    if (!routeIds.has(s.to)) errors.push(`stage "${s.stage}": entry route "${s.to}" is unknown`);
  }
  if (errors.length) {
    console.error("extract-flow-map FAILED:\n" + errors.map((e) => `  - ${e}`).join("\n"));
    process.exit(1);
  }

  const flowMap: FlowMap = {
    version: 1,
    generatedAt: new Date().toISOString(),
    routes,
    chrome,
    stageEntries,
  };

  const outPath = path.join(ROOT, "ux-out", "ux-flow-map.json");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(flowMap, null, 2));
  console.log(
    `✓ ux-flow-map.json: ${routes.length} routes, ${chrome.length} chrome source(s), ${stageEntries.length} stage entries.`,
  );
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
