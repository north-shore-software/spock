import { node } from "@spock/router";
import type { Document } from "../data/store";
import { NodeBox } from "./node-box";

const { page, useData } = node<Document>();

/** Rendered by both the `document` route and the `share-link` route. */
export const DocumentPage = page(function DocumentPage() {
  const doc = useData();
  return (
    <NodeBox>
      <h3>{doc.title}</h3>
      <p>{doc.body}</p>
    </NodeBox>
  );
});
