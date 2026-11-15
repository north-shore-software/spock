import { createContext, useContext } from "react";
import type { Router } from "./router";

export const RouterContext = createContext<Router | null>(null);

/** The router passed to `RouterProvider`. */
export function useRouterContext(): Router {
  const router = useContext(RouterContext);
  if (!router) throw new Error("No RouterProvider above this component");
  return router;
}
