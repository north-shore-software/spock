import { Link as Go, Outlet, type RouteName } from "@spock/router";
import { Nav } from "./nav.tsx";

export function Layout() {
  return (
    <div>
      <Nav />
      <Outlet />
    </div>
  );
}

export function Home() {
  const wide = window.innerWidth > 800;
  return <Go to={wide ? "settings" : "section.teams"}>Go</Go>;
}

export function Settings() {
  return (
    <p>
      <a href="/teams">Teams</a> <a href="https://example.com">Docs</a> <a href="#top">Top</a>
    </p>
  );
}

export function Section() {
  return <Outlet />;
}

export function Teams() {
  return <Outlet />;
}

export function TeamList() {
  return (
    <Go to="section.teams.team" params={{ teamId: "t1" }}>
      Team 1
    </Go>
  );
}

export function Team() {
  const target: RouteName = "home";
  return <Go to={target}>Home</Go>;
}

export function Missing() {
  return <Go to="home">Back home</Go>;
}

/** Not used by any route. */
export function Orphan() {
  return <Go to="settings">Settings</Go>;
}
