import { createContext, useContext } from "react";
import type { MockClient } from "@/testing/mock-client";

/**
 * Provided by WorkspaceContainer (app) or PageStory (stories). No default:
 * using it outside a provider throws, exactly like the host app's client hook.
 */
export const KalaidoscopeClientContext = createContext<MockClient | null>(null);

export function useKalaidoscopeClient(): MockClient {
  const client = useContext(KalaidoscopeClientContext);
  if (!client) {
    throw new Error("useKalaidoscopeClient must be used within a WorkspaceContainer/PageStory");
  }
  return client;
}
