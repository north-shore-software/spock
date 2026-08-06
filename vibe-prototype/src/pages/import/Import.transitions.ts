import { defineTransitions } from "@/routes/route-kit";

export const importTransitions = defineTransitions({
  backToStream: {
    to: "stream",
    trigger: "Click the back arrow or 'Cancel'",
  },
  doneImporting: {
    to: "stream",
    trigger: "Click 'Done Importing'",
    when: "Returns to the stream to see ingested fragments",
  },
});
