import { ROUTE_IDS, type RouteId } from "./route-ids";
import { buildRoutePath, type RouteDef } from "./route-kit";

import { splashRoute } from "@/pages/splash/Splash";
import { mainRoute } from "@/pages/main/Main";
import { streamRoute } from "@/pages/stream/Stream";
import { importRoute } from "@/pages/import/Import";
import { projectionsRoute } from "@/pages/projections/Projections";
import { projectionDetailRoute } from "@/pages/projections/ProjectionDetail";

/**
 * LAZY on purpose. Pages and the registry form an import cycle (pages export
 * their RouteDefs; the nav helpers pages use resolve routes via the registry).
 * That cycle is fine at runtime — but building this table at module scope
 * throws a TDZ ReferenceError whenever a page module is the ENTRY point of the
 * graph (e.g. a Ladle page story imports the page directly): the registry body
 * would read the page's not-yet-initialized RouteDef const. Building on first
 * call runs after every module has initialized.
 */
let routes: RouteDef[] | null = null;
let byId: Map<RouteId, RouteDef> | null = null;

export function getAppRoutes(): RouteDef[] {
  if (!routes) {
    routes = [
      splashRoute,
      mainRoute,
      streamRoute,
      importRoute,
      projectionsRoute,
      projectionDetailRoute,
    ];
  }
  return routes;
}

function table(): Map<RouteId, RouteDef> {
  if (!byId) {
    const all = getAppRoutes();
    byId = new Map(all.map((r) => [r.id, r]));
    // Registry integrity — throws on first navigation/render in dev if a page
    // was forgotten.
    if (import.meta.env.DEV) {
      const missing = ROUTE_IDS.filter((id) => !byId!.has(id));
      if (missing.length) throw new Error(`registry: missing RouteDefs for: ${missing.join(", ")}`);
      if (byId.size !== all.length) throw new Error("registry: duplicate route ids");
    }
  }
  return byId;
}

export function routeById(id: RouteId): RouteDef {
  const def = table().get(id);
  if (!def) throw new Error(`routeById: no RouteDef registered for "${id}"`);
  return def;
}

export function pathFor(id: RouteId, params?: Record<string, string>): string {
  return buildRoutePath(routeById(id), params);
}
