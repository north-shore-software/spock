import { defineChromeTransitions } from "@/routes/route-kit";

export const appNavTransitions = defineChromeTransitions("chrome:app-nav", "App Navigation", {
  openDashboard: { to: "main", trigger: "Click 'Dashboard' in the app nav" },
  openStream: { to: "stream", trigger: "Click 'Stream' in the app nav" },
  openProjections: { to: "projections", trigger: "Click 'Projections' in the app nav" },
  openImport: { to: "import", trigger: "Click 'Import' in the app nav" },
});
