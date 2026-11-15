import { Link, node, Outlet } from "@spock/router";
import type { Store } from "../data/store";
import { NodeBox } from "./node-box";

const { page, useData } = node<Store>();

export const RootLayout = page(function RootLayout() {
  const store = useData();
  return (
    <NodeBox>
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
});

export function NotFound() {
  return <p className="not-found">Not found.</p>;
}
