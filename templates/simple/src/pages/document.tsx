import { useData } from "@spock/core";
import type { Document } from "../data/store";
import { NodeBox } from "./node-box";

/** Rendered by both the `document` route and the `share-link` route. */
export function DocumentPage() {
  const doc = useData<Document>();
  return (
    <NodeBox node={`documents.${doc.id}`}>
      <h3>{doc.title}</h3>
      <p>{doc.body}</p>
    </NodeBox>
  );
}
