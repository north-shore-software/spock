import type { CollectionName, CollectionsMap } from "./fixtures";

export type MockClientOptions = {
  fixtures?: Partial<CollectionsMap>;
  /** Never resolve — freezes pages in their loading state. */
  pending?: boolean;
  /** Reject every request — drives error states. */
  failing?: boolean;
  /** Artificial delay in ms before resolving (default 0). */
  delay?: number;
};

export type MockClient = {
  baseURL: string;
  collection<N extends CollectionName>(
    name: N,
  ): {
    getFullList(): Promise<CollectionsMap[N]>;
    getOne(id: string): Promise<CollectionsMap[N][number]>;
  };
};

let instance = 0;

/**
 * The fixture analogue of a per-workspace PocketBase client: pages only ever
 * see this surface (via useKalaidoscopeClient), so stories can drive
 * populated / loading / empty / error states purely through data.
 */
export function createMockClient(opts: MockClientOptions = {}): MockClient {
  const { fixtures = {}, pending = false, failing = false, delay = 0 } = opts;
  // Unique baseURL per instance so nothing caches across stories.
  const baseURL = `mock://workspace-${instance++}`;

  async function resolve<T>(value: () => T): Promise<T> {
    if (pending) return new Promise<T>(() => {});
    if (delay) await new Promise((r) => setTimeout(r, delay));
    if (failing) throw new Error("[mock] request failed (failing: true)");
    return value();
  }

  return {
    baseURL,
    collection(name) {
      return {
        getFullList: () => resolve(() => fixtures[name] ?? ([] as never)),
        getOne: (id) =>
          resolve(() => {
            const record = (fixtures[name] ?? []).find((r) => r.id === id);
            if (!record) throw new Error(`[mock] no record "${id}" in "${name}"`);
            return record as CollectionsMap[typeof name][number];
          }),
      };
    },
  };
}
