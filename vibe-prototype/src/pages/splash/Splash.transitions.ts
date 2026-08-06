import { defineTransitions } from "@/routes/route-kit";

export const splashTransitions = defineTransitions({
  enterApp: {
    to: "main",
    trigger: "Click 'Launch Core Terminal'",
    when: "Opens the demo workspace, granting the kalaidoscope scope",
  },
});
