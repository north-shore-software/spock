// Every route-to-data binding: a selector from route params to a node.
// router.ts attaches them with `data:`; a route whose path lacks a param its
// selector needs is a type error there.
// Params are plain strings for now; see NOTES.md at the repo root for how
// branded ids would fit.
import { store } from "./store";

export const root = () => store;

export const org = (p: { orgId: string }) => store.orgs[p.orgId];

export const project = (p: { orgId: string; projectId: string }) =>
  store.orgs[p.orgId]?.projects[p.projectId];

export const document = (p: { orgId: string; projectId: string; documentId: string }) =>
  store.orgs[p.orgId]?.projects[p.projectId]?.documents[p.documentId];
