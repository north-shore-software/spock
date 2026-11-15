import { Link, Outlet, useData, useDataProxy, useParams } from "@spock/router";
import type { Project } from "../data/store";
import { NodeBox } from "./node-box";

/** Portable: works under any route bound to a project. */
export function ProjectHeader() {
  const project = useData<Project>();
  return <h2>Project: {project.name}</h2>;
}

export function ProjectLayout() {
  const project = useData("org.project");
  const params = useParams("org.project");
  return (
    <NodeBox node={`projects.${project.id}`}>
      <ProjectHeader />
      <nav>
        <Link to="org.project.overview" params={params} exact>
          Overview
        </Link>
        <Link to="org.project.settings" params={params}>
          Settings
        </Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
}

export function ProjectOverview() {
  const project = useData("org.project.overview");
  const params = useParams("org.project.overview");
  return (
    <NodeBox node={`projects.${project.id}`}>
      <h3>Documents</h3>
      <ul>
        {Object.values(project.documents).map((d) => (
          <li key={d.id}>
            {/* Reuses this route's params and adds the document id. */}
            <Link to="org.project.document" params={{ ...params, documentId: d.id }}>
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </NodeBox>
  );
}

export function ProjectSettings() {
  // Writes go through the live proxy; reads through a snapshot.
  // `sync: true` re-renders synchronously, so the caret doesn't jump.
  const proxy = useDataProxy("org.project.settings");
  const project = useData("org.project.settings", { sync: true });
  return (
    <NodeBox node={`projects.${project.id}`}>
      <h3>Settings</h3>
      <label>
        Name{" "}
        <input
          value={project.name}
          onChange={(e) => {
            // valtio proxies exist to be mutated; the rule assumes hook results are immutable.
            // oxlint-disable-next-line react/immutability
            proxy.name = e.target.value;
          }}
        />
      </label>
    </NodeBox>
  );
}
