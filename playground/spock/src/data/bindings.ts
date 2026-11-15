// Every route-to-data binding lives here. Routes attach them via `beforeLoad`.
// The store is imported here rather than put in router context, so routes
// only ever see the node their binding selects.
import { bind } from "./bind";
import { store } from "./store";

export const root = bind(() => store);

export const org = bind((p: { orgId: string }) => store.orgs[p.orgId]);
