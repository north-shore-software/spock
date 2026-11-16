// Components: the provider, links by route name, and the outlet.
import { Component, memo, useEffect, useLayoutEffect, useMemo, type ReactNode } from "react";
import {
  BrowserRouter,
  generatePath,
  MemoryRouter,
  NavLink,
  useLocation,
  useNavigate,
  useNavigationType,
} from "react-router";
import { LevelContext, RouterContext, useLevel, useRouterContext } from "./context";
import type { EntryOf, ParamsOf, RouteName } from "./hooks";
import { paramNames, toPattern } from "./paths";
import { resolve, type Resolution } from "./resolve";
import type { Router } from "./router";

export type RouterProviderProps = {
  router: Router;
  /**
   * Render this URL from memory instead of the browser's address bar, e.g.
   * for a story, a test or a static export. Links still navigate, in memory.
   */
  initialPath?: string;
};

export function RouterProvider(props: RouterProviderProps) {
  const page = (
    <RouterContext value={props.router}>
      <Page />
    </RouterContext>
  );
  if (props.initialPath === undefined) {
    return (
      <BrowserRouter>
        <ScrollReset />
        {page}
      </BrowserRouter>
    );
  }
  return <MemoryRouter initialEntries={[props.initialPath]}>{page}</MemoryRouter>;
}

/**
 * Scrolls to the top after a link or `navigate` moves to a new page. Back and
 * forward are left to the browser. Not used from memory, where the window
 * isn't the app's to scroll.
 */
function ScrollReset() {
  const { key, hash } = useLocation();
  const type = useNavigationType();
  useLayoutEffect(() => {
    if (type !== "POP" && !hash) window.scrollTo(0, 0);
  }, [key, hash, type]);
  return null;
}

/** Resolves the current location, and renders it from the root route down. */
function Page() {
  const router = useRouterContext();
  const location = useLocation();
  const navigate = useNavigate();
  const resolution = useMemo(() => resolve(router, location), [router, location]);
  useEffect(() => router.session.publish(resolution, navigate), [router, resolution, navigate]);
  const level = useMemo(() => ({ resolution, depth: -1 }), [resolution]);
  return (
    <LevelContext value={level}>
      <Outlet />
    </LevelContext>
  );
}

/**
 * Renders the next route down: the child route that matched, or "not found"
 * if this is as far as the page got. A route without a component renders
 * just an outlet.
 *
 * Memoised, and it takes no props, so it re-renders only on navigation: a
 * layout re-rendering doesn't re-render the pages inside it.
 */
export const Outlet = memo(function Outlet(): ReactNode {
  const { resolution, depth } = useLevel();
  const next = depth + 1;
  const level = useMemo(() => ({ resolution, depth: next }), [resolution, next]);
  const match = resolution.matches[next];
  if (match) {
    const Route = match.route.def.component ?? Outlet;
    return (
      <LevelContext value={level}>
        <RouteErrorBoundary route={match.route.name} resolution={resolution}>
          <Route />
        </RouteErrorBoundary>
      </LevelContext>
    );
  }
  if (next === resolution.matches.length && resolution.notFound) {
    const NotFound = resolution.notFound.component;
    return <NotFound />;
  }
  return null;
});

type BoundaryProps = { route: string; resolution: Resolution; children: ReactNode };
type BoundaryState = { error: unknown; resolution: Resolution };

/**
 * Catches an error thrown while rendering a route, e.g. a `Link` missing a
 * param, and shows it in place of that route. The layouts above it, and their
 * links, keep working. Cleared on the next navigation.
 */
class RouteErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  override state: BoundaryState = { error: undefined, resolution: this.props.resolution };

  static getDerivedStateFromError(error: unknown): Partial<BoundaryState> {
    return { error };
  }

  static getDerivedStateFromProps(props: BoundaryProps, state: BoundaryState): Partial<BoundaryState> | null {
    return props.resolution === state.resolution ? null : { error: undefined, resolution: props.resolution };
  }

  override render() {
    const { error } = this.state;
    if (error === undefined) return this.props.children;
    return (
      <div role="alert" className="spock-route-error">
        <p>
          Error rendering route <code>{this.props.route}</code>:
        </p>
        <pre>{error instanceof Error ? error.message : String(error)}</pre>
      </div>
    );
  }
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
  const { to, params, exact, className, children } = props;
  const path = useRouterContext().paths.get(to);
  if (path === undefined) throw new Error(`Link: no route named "${to}"`);
  const { resolution, depth } = useLevel();
  const current = resolution.matches[depth]?.params ?? {};
  const merged: Record<string, string | undefined> = { ...current, ...params };
  const missing = paramNames(path).filter((name) => merged[name] === undefined);
  if (missing.length > 0) {
    throw new Error(`Link to "${to}": missing params ${missing.join(", ")}; the current route doesn't have them`);
  }
  return (
    <NavLink
      to={generatePath(toPattern(path), merged)}
      end={exact}
      className={({ isActive }) => [className, isActive && "active"].filter(Boolean).join(" ") || undefined}
    >
      {children}
    </NavLink>
  );
}
