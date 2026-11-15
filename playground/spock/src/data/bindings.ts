// Every route-to-data binding lives here. Routes attach them via `beforeLoad`.
// The store is imported here rather than put in router context, so routes
// only ever see the node their binding selects.
// Params are plain strings for now; see NOTES.md for how branded ids would fit.
import { bind } from "./bind";
import { store } from "./store";

export const root = bind(() => store);

export const org = bind((p: { orgId: string }) => store.orgs[p.orgId]);

export const project = bind(
  (p: { orgId: string; projectId: string }) => store.orgs[p.orgId]?.projects[p.projectId],
);

export const document = bind(
  (p: { orgId: string; projectId: string; documentId: string }) =>
    store.orgs[p.orgId]?.projects[p.projectId]?.documents[p.documentId],
);
