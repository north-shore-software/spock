import { defineTransitions } from "@/routes/route-kit";

export const streamTransitions = defineTransitions({
  backToDashboard: {
    to: "main",
    trigger: "Click the back arrow in the stream header",
  },
  openImport: {
    to: "import",
    trigger: "Click 'Go to Import Source' in the empty state",
    when: "Stream has no fragments",
  },
  openFragment: {
    to: "stream",
    trigger: "Click a stream card",
    when: "Opens the fragment drawer (/stream/:id)",
    animation: "slide-in-right 200ms",
  },
  closeFragment: {
    to: "stream",
    trigger: "Close the fragment drawer",
  },
});
