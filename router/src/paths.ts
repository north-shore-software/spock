/** The `$name` params in a TanStack path, e.g. `/$orgId/projects/$projectId`. */
export function paramNames(path: string): string[] {
  return path
    .split("/")
    .filter((segment) => segment.startsWith("$"))
    .map((segment) => segment.slice(1));
}
