import { Link, Outlet, useData } from "@spock/core";
import { NodeBox } from "./node-box";

export function RootLayout() {
  const store = useData("root");
  return (
    <NodeBox node="store">
      <nav>
        {Object.values(store.orgs).map((org) => (
          <Link key={org.id} to="org" params={{ orgId: org.id }}>
            {org.name}
          </Link>
        ))}
      </nav>
      <Outlet />
    </NodeBox>
  );
}

export function NotFound() {
  return <p className="not-found">Not found.</p>;
}
