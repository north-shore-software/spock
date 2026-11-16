// What the Vite plugin sends the toolbar's Flows app, as a custom HMR event.
// Shared by plugin.ts (Node) and the client.
import type { FlowGraph } from "@spock/router/flows/graph";

/** The client asks for the current graph with this; the server answers with `flowsEvent`. */
export const flowsRequest = "spock:flows-request";
export const flowsEvent = "spock:flows";

export type FlowsMessage =
  /** `root` is the directory the graph's file paths are relative to. */
  | { graph: FlowGraph; root: string }
  /** Extraction failed, e.g. TypeScript isn't installed. */
  | { error: string };
