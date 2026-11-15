import { Link, Outlet, useData } from "@spock/router";
import { NodeBox } from "./node-box";

export function OrgLayout() {
  const org = useData("org");
  return (
    <NodeBox node={`orgs.${org.id}`}>
      <h1>{org.name}</h1>
      <nav>
        <Link to="org.home" params={{ orgId: org.id }} exact>
          Home
        </Link>
        <Link to="org.members" params={{ orgId: org.id }}>
          Members
        </Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
}

export function OrgHome() {
  const org = useData("org.home");
  return (
    <NodeBox node={`orgs.${org.id}`}>
      <h2>Projects</h2>
      <ul>
        {Object.values(org.projects).map((p) => (
          <li key={p.id}>
            <Link to="org.project" params={{ orgId: org.id, projectId: p.id }}>
              {p.name}
            </Link>
          </li>
        ))}
      </ul>
    </NodeBox>
  );
}

export function Members() {
  const org = useData("org.members");
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
