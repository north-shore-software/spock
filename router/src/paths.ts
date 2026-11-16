/** The `$name` params in a path, e.g. `/$orgId/projects/$projectId`. */
export function paramNames(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.startsWith("$"))
    .map((segment) => segment.slice(1));
}

/** A spock path in React Router's syntax: `projects/$projectId` → `projects/:projectId`. */
export function toPattern(path: string): string {
  return path
    .split("/")
    .map((segment) => (segment.startsWith("$") ? `:${segment.slice(1)}` : segment))
    .join("/");
}

/** Joins a parent's full path and a child's relative one: `/$orgId` + `members`. */
export function joinPaths(parent: string, child: string): string {
  if (child === "/" || child === "") return parent;
  return parent === "/" ? `/${child}` : `${parent}/${child}`;
}
