// The flow graph the Vite plugin sends, for the Flows app and the overlay's
// flowchart. One subscription to the dev server, shared.
import { flowsEvent, flowsRequest, type FlowsMessage } from "../flows-message";

let message: FlowsMessage | undefined;
const listeners = new Set<() => void>();

import.meta.hot?.on(flowsEvent, (next: FlowsMessage) => {
  message = next;
  listeners.forEach((listener) => listener());
});
// The plugin sends the graph when it changes; this gets the current one.
import.meta.hot?.send(flowsRequest);

export const flowsData = {
  /** `undefined` until the dev server has sent the graph. */
  get: () => message,
  /** Calls `listener` when a new graph arrives. Returns an unsubscribe. */
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => void listeners.delete(listener);
  },
};
