import { useRouteInfo } from "@spock/router";
import type { ReactNode } from "react";

/**
 * A labelled frame showing which route rendered it, and whether that route
 * is bound to its node or inherits it. Both come from the nearest match, the
 * same one `useData()` reads.
 */
export function NodeBox(props: { children?: ReactNode }) {
  const { name, boundAt } = useRouteInfo();
  return (
    <section className="node-box">
      <header>
        <code>{name}</code>{" "}
        {boundAt === name ? (
          "bound"
        ) : (
          <>
            inherits <code>{boundAt}</code>
          </>
        )}
      </header>
      {props.children}
    </section>
  );
}
