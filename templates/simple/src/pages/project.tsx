import { Link, node, Outlet } from "@spock/router";
import type { Project } from "../data/store";
import { NodeBox } from "./node-box";

const { page, useData, useDataProxy } = node<Project>();

/** Portable: works under any route bound to a project. Not a page, so not checked by the tree. */
export function ProjectHeader() {
  const project = useData();
  return <h2>Project: {project.name}</h2>;
}

export const ProjectLayout = page(function ProjectLayout() {
  return (
    <NodeBox>
      <ProjectHeader />
      <nav>
        <Link to="org.project.overview" exact>
          Overview
        </Link>
        <Link to="org.project.settings">Settings</Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
});

export const ProjectOverview = page(function ProjectOverview() {
  const project = useData();
  return (
    <NodeBox>
      <h3>Documents</h3>
      <ul>
        {Object.values(project.documents).map((d) => (
          <li key={d.id}>
            {/* Keeps this route's orgId and projectId; adds the document id. */}
            <Link to="org.project.document" params={{ documentId: d.id }}>
              {d.title}
            </Link>
          </li>
        ))}
      </ul>
    </NodeBox>
  );
});

export const ProjectSettings = page(function ProjectSettings() {
  // Writes go through the live proxy; reads through a snapshot.
  // `sync: true` re-renders synchronously, so the caret doesn't jump.
  const proxy = useDataProxy();
  const project = useData({ sync: true });
  return (
    <NodeBox>
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
});
