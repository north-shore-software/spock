import { proxy } from "valtio";

// The data tree: shaped by the domain, not by the URLs.
// Syncing with a database is out of scope; the store is seeded in memory.
//
// RULE: records are mutated in place. Never delete or replace a record
// (an org, project or document) while the app is running.
//
// Why: `useData()` subscribes to the node's own proxy, the one its binding
// found at render time. Deleting or replacing a record changes its *parent*
// (e.g. `project.documents`), which that subscription doesn't see. The page
// keeps showing the old record, and the "Record removed while viewing" error
// in @spock/router only fires if something else happens to re-render it.
//
// Lifting this rule means subscribing to the path from the store root instead
// of the node, e.g. by running the binding's selector against
// `useSnapshot(store)` so valtio tracks every step of the path.

export type Document = {
  id: string;
  title: string;
  body: string;
};

export type Project = {
  id: string;
  name: string;
  documents: Record<string, Document>;
};

export type Member = {
  id: string;
  name: string;
};

export type Org = {
  id: string;
  name: string;
  members: Record<string, Member>;
  projects: Record<string, Project>;
};

export type Store = {
  orgs: Record<string, Org>;
};

export const store = proxy<Store>({
  orgs: {
    acme: {
      id: "acme",
      name: "Acme Corp",
      members: {
        ada: { id: "ada", name: "Ada Lovelace" },
        alan: { id: "alan", name: "Alan Turing" },
      },
      projects: {
        web: {
          id: "web",
          name: "Website",
          documents: {
            spec: { id: "spec", title: "Spec", body: "What the website should do." },
            roadmap: { id: "roadmap", title: "Roadmap", body: "When it will do it." },
          },
        },
        mobile: {
          id: "mobile",
          name: "Mobile App",
          documents: {
            spec: { id: "spec", title: "Mobile Spec", body: "Same id as web/spec, different record." },
          },
        },
      },
    },
    globex: {
      id: "globex",
      name: "Globex",
      members: {
        hank: { id: "hank", name: "Hank Scorpio" },
      },
      projects: {
        web: {
          id: "web",
          name: "Globex Website",
          documents: {
            spec: { id: "spec", title: "Globex Spec", body: "Same ids as acme/web/spec, different org." },
          },
        },
      },
    },
  },
});
