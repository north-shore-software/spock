// Everything the toolbar uses from React Grab (`react-grab/primitives`): the
// element under the cursor, and which component rendered it and where in the
// source. React Grab is pre-1.0, so nothing else imports it; a change to its
// API stops here.
import {
  getElementAtPoint,
  getElementBounds,
  getElementContext,
  isElementGrabbable,
  type ElementBounds,
  type ReactGrabElementContext,
} from "react-grab/primitives";

export type Bounds = ElementBounds;

/** What React Grab knows about an element. */
export type Grabbed = {
  /** The innermost component that rendered it, if React Grab found one. */
  componentName: string | null;
  /**
   * The element's HTML, then the app's components that rendered it, innermost
   * first, each with its file and line. E.g.
   *
   * ```
   * <h2>
   *   Project: Website
   * </h2>
   *   in ProjectHeader (at src/pages/project.tsx:10)
   *   in ProjectLayout (at src/pages/project.tsx:16)
   * ```
   */
  text: string;
};

/**
 * The topmost element at viewport point `x, y` worth picking, skipping
 * whatever `skip` returns true for (the toolbar's own elements).
 */
export function elementAt(x: number, y: number, skip: (element: Element) => boolean): Element | null {
  return getElementAtPoint(x, y, { filter: (element) => !skip(element) && isElementGrabbable(element) });
}

/** Where `element` is on screen, in viewport coordinates. */
export const boundsOf = (element: Element): Bounds => getElementBounds(element);

/** Reads the component stack and source locations, mapped through source maps, so it can take a moment. */
export async function grab(element: Element): Promise<Grabbed> {
  const context = await getElementContext(element);
  return { componentName: context.componentName, text: format(context) };
}

/**
 * Not React Grab's own `snippet`: that drops line numbers, and lists library
 * frames (the router's, React's) between the app's components. This keeps the
 * app's frames only, which React Grab marks as not ignore-listed, with lines.
 */
function format({ htmlPreview, stack, selector, fiber }: ReactGrabElementContext): string {
  const paths = sourcePaths(fiber);
  const frames = stack
    .filter((frame) => frame.fileName !== undefined && !frame.isIgnoreListed)
    .map(({ functionName, fileName, lineNumber }) => {
      const path = resolvePath(fileName!, functionName, paths);
      const at = lineNumber === undefined ? path : `${path}:${lineNumber}`;
      return `  in ${functionName ?? "(anonymous)"} (at ${at})`;
    });
  return [htmlPreview, ...frames, ...(selector ? [`  selector: ${selector}`] : [])].join("\n");
}

type Fiber = NonNullable<ReactGrabElementContext["fiber"]>;

/** `at Name (http://host/path:line:col)` in a V8 stack. */
const frameUrl = /^\s*at (\S+) \((https?:\/\/[^)]+?):\d+:\d+\)$/;

/**
 * Each component's source file, as the dev server serves it, keyed by
 * function name. Source maps name a file relative to itself (`project.tsx`),
 * so React Grab only knows the file's name. React's owner stacks still have
 * the URL it was served from, e.g. `/src/pages/project.tsx`.
 */
function sourcePaths(fiber: Fiber | null): Map<string, string> {
  const paths = new Map<string, string>();
  for (let owner: Fiber | null | undefined = fiber; owner; owner = owner._debugOwner) {
    for (const line of owner._debugStack?.stack?.split("\n") ?? []) {
      const match = frameUrl.exec(line);
      if (!match) continue;
      const [, name, url] = match;
      if (!paths.has(name!)) paths.set(name!, pathOf(new URL(url!).pathname));
    }
  }
  return paths;
}

/**
 * `/src/pages/project.tsx` is relative to the app's root; files outside it,
 * like workspace packages, are served from `/@fs/` and an absolute path.
 */
const pathOf = (pathname: string) => {
  const path = decodeURIComponent(pathname);
  return path.startsWith("/@fs/") ? path.slice("/@fs".length) : path.slice(1);
};

/**
 * The full path of `fileName`: the file `functionName` was served from, if
 * that's it, or else the only known file with that name. The outermost
 * component has no owner, so no stack names its URL.
 */
function resolvePath(fileName: string, functionName: string | undefined, paths: Map<string, string>): string {
  const matches = (path: string) => path === fileName || path.endsWith(`/${fileName}`);
  const own = functionName === undefined ? undefined : paths.get(functionName);
  if (own !== undefined && matches(own)) return own;
  const candidates = new Set([...paths.values()].filter(matches));
  return candidates.size === 1 ? [...candidates][0]! : fileName;
}
