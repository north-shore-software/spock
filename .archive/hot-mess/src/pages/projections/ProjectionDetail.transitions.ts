import { defineTransitions } from "@/routes/route-kit";

export const projectionDetailTransitions = defineTransitions({
  backToList: {
    to: "projections",
    trigger: "Click the back arrow in the detail header",
  },
  viewSnapshot: {
    to: "projection-detail",
    trigger: "Click a snapshot chip",
    when: "Opens the read-only snapshot view (/projections/:id/snapshot/:snapshotId)",
  },
  backToLive: {
    to: "projection-detail",
    trigger: "Click 'Back to live' in the snapshot banner",
    when: "Only shown in the read-only snapshot view",
  },
});
