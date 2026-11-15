/**
 * The data contract between extraction (scripts/extract-flow-map.ts) and the
 * canvas (src/canvas). The verifier owns enforcement; change shapes here first.
 */

export type FlowMapTransition = {
  /** The transition's key in its Record, e.g. "openImport". */
  key: string;
  /** Target route id. */
  to: string;
  trigger: string;
  when?: string;
  animation?: string;
};

export type FlowMapStory = {
  /** Ladle story id, e.g. "pages--stream--default". */
  storyId: string;
  /** Export name, e.g. "Default". */
  name: string;
  /** True for the story the canvas shows as the big preview. */
  isPrimary: boolean;
};

export type FlowMapRoute = {
  id: string;
  path: string;
  aliases: string[];
  feature: string;
  requiredScope: string[];
  transitions: FlowMapTransition[];
  stories: FlowMapStory[];
};

export type FlowMapChromeSource = {
  /** e.g. "chrome:app-nav". */
  source: string;
  /** Human label, e.g. "App Navigation". */
  label: string;
  transitions: FlowMapTransition[];
};

export type FlowMapStageEntry = {
  /** App stage name, e.g. "bootstrap". */
  stage: string;
  /** Route id the app enters on that stage. */
  to: string;
};

export type FlowMap = {
  version: 1;
  generatedAt: string;
  routes: FlowMapRoute[];
  chrome: FlowMapChromeSource[];
  stageEntries: FlowMapStageEntry[];
};
