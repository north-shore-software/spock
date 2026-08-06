import { defineTransitions } from "@/routes/route-kit";

export const mainTransitions = defineTransitions({
  openStream: {
    to: "stream",
    trigger: "Click 'Launch Stream' card",
  },
  openProjections: {
    to: "projections",
    trigger: "Click 'View Projections' card",
  },
  signOut: {
    to: "splash",
    trigger: "Click 'Exit Workspace'",
    when: "Drops the kalaidoscope scope before navigating",
  },
});
