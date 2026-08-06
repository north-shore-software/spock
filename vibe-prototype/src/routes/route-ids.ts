/** Every routable screen in the fixture app. Adding a page = adding an id here first. */
export const ROUTE_IDS = [
  "splash",
  "main",
  "stream",
  "import",
  "projections",
  "projection-detail",
] as const;

export type RouteId = (typeof ROUTE_IDS)[number];
