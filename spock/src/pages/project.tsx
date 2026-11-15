import { Link, Outlet } from "@tanstack/react-router";
import { useData, useDataFor, useDataProxyFor } from "../data/use-data";
import { projectOverviewRoute, projectRoute, projectSettingsRoute } from "../router";
import type { Project } from "../data/store";
import { NodeBox } from "./node-box";

/** Portable: works under any route bound to a project. */
export function ProjectHeader() {
  const project = useData<Project>();
  return <h2>Project: {project.name}</h2>;
}

export function ProjectLayout() {
  const project = useDataFor(projectRoute);
  return (
    <NodeBox node={`projects.${project.id}`}>
      <ProjectHeader />
      <nav>
        <Link
          from="/$orgId/projects/$projectId"
          to="/$orgId/projects/$projectId"
          activeOptions={{ exact: true }}
        >
          Overview
        </Link>
        <Link from="/$orgId/projects/$projectId" to="/$orgId/projects/$projectId/settings">
          Settings
        </Link>
      </nav>
      <Outlet />
    </NodeBox>
  );
}

export function ProjectOverview() {
  const project = useDataFor(projectOverviewRoute);
  return (
    <NodeBox node={`projects.${project.id}`}>
      <h3>Documents</h3>
      <ul>
        {Object.values(project.documents).map((d) => (
          <li key={d.id}>
            {/* Adds documentId to the current params; no org/project ids here. */}
            <Link
              from="/$orgId/projects/$projectId/"
              to="/$orgId/projects/$projectId/docs/$documentId"
              params={(prev) => ({ ...prev, documentId: d.id })}
            >
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
  const proxy = useDataProxyFor(projectSettingsRoute);
  const project = useDataFor(projectSettingsRoute, { sync: true });
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
