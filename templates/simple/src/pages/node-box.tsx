import { useRouteName } from "@spock/core";
import type { ReactNode } from "react";

/**
 * A labelled frame showing which route rendered it and which node it got.
 * The route name comes from the nearest match, the same one `useData()` reads.
 */
export function NodeBox(props: { node: string; children?: ReactNode }) {
  const route = useRouteName();
  return (
    <section className="node-box">
      <header>
        <code>{route}</code> → <code>{props.node}</code>
      </header>
      {props.children}
    </section>
  );
}
