export interface StreamFragment {
  id: string;
  title: string;
  content: string;
  kind: "note" | "event" | "doc";
  time: string;
}

export interface Projection {
  id: string;
  title: string;
  status: "Active" | "Draft" | "Review";
  summary: string;
  updated: string;
  snapshotIds: string[];
}

export type CollectionsMap = {
  view_stream: StreamFragment[];
  projections: Projection[];
};

export type CollectionName = keyof CollectionsMap;

export const DEFAULT_FIXTURES: CollectionsMap = {
  view_stream: [
    {
      id: "frag-1",
      title: "Reflective Canvas Node",
      content: "Active fragments parsed from the mock event bus. Payload includes node telemetry and scope markers.",
      kind: "event",
      time: "09:14",
    },
    {
      id: "frag-2",
      title: "Ladle Story Configuration",
      content: "Static HTML structure captured for the pages--stream stories, including the drawer variant.",
      kind: "doc",
      time: "10:02",
    },
    {
      id: "frag-3",
      title: "Flow Map Extraction Run",
      content: "ux-flow-map.json regenerated: 6 routes, 1 chrome source, all transition targets resolved.",
      kind: "note",
      time: "11:47",
    },
  ],
  projections: [
    {
      id: "proj-1",
      title: "UX Flow Extractor",
      status: "Active",
      summary: "Serializes the route registry and chrome transitions into the flow-map contract consumed by the canvas.",
      updated: "2026-07-06T10:00:00Z",
      snapshotIds: ["snap-1", "snap-2"],
    },
    {
      id: "proj-2",
      title: "Static Export Worker",
      status: "Draft",
      summary: "Crawls the Ladle build and emits standalone HTML plus screenshots for every story.",
      updated: "2026-07-05T16:30:00Z",
      snapshotIds: [],
    },
    {
      id: "proj-3",
      title: "Canvas Layout Engine",
      status: "Review",
      summary: "ELK-layered swimlane layout with state clusters. A pending draft is awaiting approval.",
      updated: "2026-07-06T08:15:00Z",
      snapshotIds: ["snap-9"],
    },
  ],
};
