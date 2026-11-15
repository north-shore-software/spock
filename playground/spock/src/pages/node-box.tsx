import type { ReactNode } from "react";

/** A labelled frame, so you can see which route rendered which node. */
export function NodeBox(props: { route: string; node: string; children?: ReactNode }) {
  return (
    <section className="node-box">
      <header>
        <code>{props.route}</code> → <code>{props.node}</code>
      </header>
      {props.children}
    </section>
  );
}
