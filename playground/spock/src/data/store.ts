import { proxy } from "valtio";

// The data tree: shaped by the domain, not by the URLs.
// Syncing with a database is out of scope; the store is seeded in memory.
//
// Assumption: records are mutated in place and never replaced. A binding's
// selector re-resolves its node at render time, but `useSnapshot` subscribes
// to the proxy it was given, so a replaced record would not be noticed until
// something else re-renders the component. Revisit in a later step.

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
