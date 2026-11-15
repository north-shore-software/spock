import { Link, Outlet } from "@tanstack/react-router";
import { useDataFor } from "@spock/core";
import { rootRoute } from "../router";
import { NodeBox } from "./node-box";

export function RootLayout() {
  const store = useDataFor(rootRoute);
  return (
    <NodeBox node="store">
      <nav>
        {Object.values(store.orgs).map((org) => (
          <Link key={org.id} to="/$orgId" params={{ orgId: org.id }}>
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
