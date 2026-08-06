import { defineTransitions } from "@/routes/route-kit";

export const projectionsTransitions = defineTransitions({
  backToDashboard: {
    to: "main",
    trigger: "Click the back arrow in the projections header",
  },
  openDetail: {
    to: "projection-detail",
    trigger: "Click a projection row",
  },
});
