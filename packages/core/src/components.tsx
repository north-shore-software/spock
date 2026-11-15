// Components: the provider, links by route name, and the outlet.
import { Link as TanStackLink, RouterProvider as TanStackRouterProvider } from "@tanstack/react-router";
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

type ParamsProp<N extends RouteName> = [EntryOf<N>["params"]] extends [never]
  ? { params?: undefined }
  : { params: ParamsOf<N> };

export type LinkProps<N extends RouteName> = {
  to: N;
  /** Active only on this exact route, not its children. */
  exact?: boolean;
  className?: string;
  children?: ReactNode;
} & ParamsProp<N>;

/** A link to a route by name. Params are always given in full; spread `useParams()` to reuse them. */
export function Link<N extends RouteName>(props: LinkProps<N>) {
  const { to, params, exact, ...rest } = props;
  const path = useRouterContext().paths.get(to);
  if (path === undefined) throw new Error(`Link: no route named "${to}"`);
  return <TanStackLink {...rest} to={path} params={params} activeOptions={{ exact }} />;
}

