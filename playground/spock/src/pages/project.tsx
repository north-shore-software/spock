import { Link, Outlet } from "@tanstack/react-router";
import { useData } from "../data/use-data";
import type { Project } from "../data/store";
import { NodeBox } from "./node-box";

/** Portable: works under any route bound to a project. */
export function ProjectHeader() {
  const project = useData<Project>();
  return <h2>Project: {project.name}</h2>;
}

export function ProjectLayout() {
  const project = useData<Project>();
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
  const project = useData<Project>();
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

// Placeholder: the name input that writes through useDataProxy comes next.
export function ProjectSettings() {
  const project = useData<Project>();
  return (
    <NodeBox node={`projects.${project.id}`}>
      <h3>Settings</h3>
      <p>Name: {project.name}</p>
    </NodeBox>
  );
}
