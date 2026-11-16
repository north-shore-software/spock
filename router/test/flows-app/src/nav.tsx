import { Link } from "@spock/router";

/** Not a page: its links are on every screen whose route renders it. */
export function Nav() {
  return (
    <nav>
      <Link to="home">Home</Link>
      <Link to="section.teams">Teams</Link>
    </nav>
  );
}
