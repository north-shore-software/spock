import { Link, Outlet } from "@tanstack/react-router";
import { useData } from "../data/use-data";
import type { Org } from "../data/store";
import { NodeBox } from "./node-box";

export function OrgLayout() {
  const org = useData<Org>();
  return (
    <NodeBox node={`orgs.${org.id}`}>
      <h1>{org.name}</h1>
      <nav>
        <Link to="/$orgId" params={{ orgId: org.id }} activeOptions={{ exact: true }}>
          Home
        </Link>
        <Link to="/$orgId/members" params={{ orgId: org.id }}>
          Members
        </Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
}

export function OrgHome() {
  const org = useData<Org>();
  return (
    <NodeBox node={`orgs.${org.id}`}>
      <h2>Projects</h2>
      <ul>
        {Object.values(org.projects).map((p) => (
          <li key={p.id}>
            <Link to="/$orgId/projects/$projectId" params={{ orgId: org.id, projectId: p.id }}>
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </NodeBox>
  );
}

export function Members() {
  const org = useData<Org>();
  return (
    <NodeBox node={`orgs.${org.id}`}>
      <h2>Members</h2>
      <ul>
        {Object.values(org.members).map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </NodeBox>
  );
}
