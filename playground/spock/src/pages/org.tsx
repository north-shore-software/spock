import { Outlet } from "@tanstack/react-router";
import { useData } from "../data/use-data";
import type { Org } from "../data/store";
import { NodeBox } from "./node-box";

export function OrgLayout() {
  const org = useData<Org>();
  return (
    <NodeBox route="org" node={`orgs.${org.id}`}>
      <h1>{org.name}</h1>
      <Outlet />
    </NodeBox>
  );
}

export function OrgHome() {
  const org = useData<Org>();
  return (
    <NodeBox route="org-home" node={`orgs.${org.id}`}>
      <h2>Projects</h2>
      <ul>
        {Object.values(org.projects).map((p) => (
          <li key={p.id}>{p.name}</li>
        ))}
      </ul>
    </NodeBox>
  );
}
