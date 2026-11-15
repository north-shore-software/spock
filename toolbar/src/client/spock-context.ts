// The part of a picked element's context that only spock knows: where the page
// is in the route tree, and which data nodes its routes are bound to. Appended
// to React Grab's snippet, so an agent gets the route and store path along with
// the component and source file.
import { watchRouter, type DevRouter } from "@spock/router/devtools";

let router: DevRouter | undefined;
watchRouter((next) => {
  router = next;
});

/**
 * E.g.
 *
 * ```
 * Spock route: org.project.settings at /acme/projects/p1/settings
 *   params: orgId=acme, projectId=p1
 *   data (store paths): org → orgs.acme; org.project → orgs.acme.projects.p1
 * ```
 *
 * `undefined` when there's no spock router on the page.
 */
export function spockContext(): string | undefined {
  if (!router) return undefined;
  const { pathname, search, matches, notFound } = router.state();
  const leaf = matches.at(-1);
  const lines = [`Spock route: ${leaf?.name ?? "(none)"} at ${pathname}${search}`];

  if (notFound) {
    lines.push(
      notFound.reason === "url"
        ? "  not found: no route matches this URL"
        : `  not found: ${notFound.route}'s data selector found nothing for these params`,
    );
  }

  const params = Object.entries(leaf?.params ?? {});
  if (params.length > 0) lines.push(`  params: ${params.map(([name, value]) => `${name}=${value}`).join(", ")}`);

  const data = router.data();
  if (data) {
    // Paths are from the outermost bound route's node. That's the whole store
    // when the root route is bound, as it usually is.
    const fromStore = data.rootRoute === matches[0]?.name;
    const label = fromStore ? "data (store paths)" : `data (paths from ${data.rootRoute}'s node)`;
    const bound = data.bound.map(
      ({ route, path }) => `${route} → ${path === undefined ? "(outside)" : path.length === 0 ? "(root)" : path.join(".")}`,
    );
    lines.push(`  ${label}: ${bound.join("; ")}`);
  }

  return lines.join("\n");
}
