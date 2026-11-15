// Components: the provider, links by route name, and the outlet.
import { Link as TanStackLink, RouterProvider as TanStackRouterProvider, useMatch } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { RouterContext, useRouterContext } from "./context";
import type { EntryOf, ParamsOf, RouteName } from "./hooks";
import type { Router } from "./router";

export { Outlet } from "@tanstack/react-router";

export function RouterProvider(props: { router: Router }) {
  return (
    <RouterContext value={props.router}>
      <TanStackRouterProvider router={props.router.tanstack} />
    </RouterContext>
  );
}

// Partial: the component doesn't know its route, so the types can't know
// which params it will fill in. A missing one is caught when it renders.
type ParamsProp<N extends RouteName> = [EntryOf<N>["params"]] extends [never]
  ? { params?: undefined }
  : { params?: Partial<ParamsOf<N>> };

export type LinkProps<N extends RouteName> = {
  to: N;
  /** Active only on this exact route, not its children. */
  exact?: boolean;
  className?: string;
  children?: ReactNode;
} & ParamsProp<N>;

/**
 * A link to a route by name. Give only the params the current route doesn't
 * already have: `params={{ documentId: d.id }}` from a project page keeps its
 * `orgId` and `projectId`.
 */
export function Link<N extends RouteName>(props: LinkProps<N>) {
  const { to, params, exact, ...rest } = props;
  const path = useRouterContext().paths.get(to);
  if (path === undefined) throw new Error(`Link: no route named "${to}"`);
  const current = useMatch({ strict: false }).params as Record<string, string>;
  const merged: Record<string, string | undefined> = { ...current, ...params };
  const missing = paramNames(path).filter((name) => merged[name] === undefined);
  if (missing.length > 0) {
    throw new Error(`Link to "${to}": missing params ${missing.join(", ")}; the current route doesn't have them`);
  }
  return <TanStackLink {...rest} to={path} params={merged} activeOptions={{ exact }} />;
}

/** The `$name` params in a TanStack path, e.g. `/$orgId/projects/$projectId`. */
function paramNames(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.startsWith("$"))
    .map((segment) => segment.slice(1));
}

