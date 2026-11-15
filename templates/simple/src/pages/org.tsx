import { Link, node, Outlet } from "@spock/router";
import type { Org } from "../data/store";
import { NodeBox } from "./node-box";

const { page, useData } = node<Org>();

export const OrgLayout = page(function OrgLayout() {
  const org = useData();
  return (
    <NodeBox>
      <h1>{org.name}</h1>
      <nav>
        <Link to="org.home" exact>
          Home
        </Link>
        <Link to="org.members">Members</Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
});

export const OrgHome = page(function OrgHome() {
  const org = useData();
  return (
    <NodeBox>
      <h2>Projects</h2>
      <ul>
        {Object.values(org.projects).map((p) => (
          <li key={p.id}>
            <Link to="org.project" params={{ projectId: p.id }}>
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </NodeBox>
  );
});

export const Members = page(function Members() {
  const org = useData();
  return (
    <NodeBox>
      <h2>Members</h2>
      <ul>
        {Object.values(org.members).map((m) => (
          <li key={m.id}>{m.name}</li>
        ))}
      </ul>
    </NodeBox>
  );
});
