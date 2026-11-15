import { useMatch } from "@tanstack/react-router";
import type { ReactNode } from "react";

/**
 * A labelled frame showing which route rendered it and which node it got.
 * The route id comes from the nearest match, the same one `useData()` reads.
 */
export function NodeBox(props: { node: string; children?: ReactNode }) {
  const routeId = useMatch({ strict: false, select: (m) => m.routeId });
  return (
    <section className="node-box">
      <header>
        <code>{routeId}</code> → <code>{props.node}</code>
      </header>
      {props.children}
    </section>
  );
}
