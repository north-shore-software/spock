import { createContext, useContext } from "react";
import type { Match, Resolution } from "./resolve";
import type { Router } from "./router";

export const RouterContext = createContext<Router | null>(null);

/** The router passed to `RouterProvider`. */
export function useRouterContext(): Router {
  const router = useContext(RouterContext);
  if (!router) throw new Error("No RouterProvider above this component");
  return router;
}

/**
 * The page being rendered, and how deep in it this part of the tree is:
 * `depth` indexes `resolution.matches`, and is -1 above the root route.
 */
export type Level = { resolution: Resolution; depth: number };

export const LevelContext = createContext<Level | null>(null);

export function useLevel(): Level {
  const level = useContext(LevelContext);
  if (!level) throw new Error("No RouterProvider above this component");
  return level;
}

/**
 * The match of the route that rendered this component. A layout gets its own
 * match even while a child route is showing. A `notFound` component gets the
 * match it's shown under.
 */
export function useNearestMatch(hook: string): Match {
  const { resolution, depth } = useLevel();
  const match = resolution.matches[depth];
  if (!match) throw new Error(`${hook}: not rendered by a route`);
  return match;
}
