import assert from "node:assert/strict";
import { before, describe, test } from "node:test";
import { fileURLToPath } from "node:url";
import { extractFlows, type FlowGraph } from "./index.ts";

const at = (path: string) => fileURLToPath(new URL(path, import.meta.url));

const screens = (graph: FlowGraph) => graph.routes.filter((route) => route.screen).map((route) => route.name);
const edges = (graph: FlowGraph) => graph.edges.map((edge) => `${edge.from} → ${edge.to}`).sort();
const problems = (graph: FlowGraph) =>
  graph.problems.map((problem) => `${problem.kind} ${problem.at.file}:${problem.at.line}`).sort();

describe("templates/simple", () => {
  let graph: FlowGraph;
  before(() => {
    graph = extractFlows(at("../../../templates/simple/tsconfig.app.json"));
  });

  test("routes match the tree, with TanStack's full paths", () => {
    assert.deepEqual(
      graph.routes.map((route) => [route.name, route.path, route.bound, route.landsOn]),
      [
        ["root", "/", true, "root"],
        ["org", "/$orgId", true, "org.home"],
        ["org.home", "/$orgId/", false, "org.home"],
        ["org.members", "/$orgId/members", false, "org.members"],
        ["org.project", "/$orgId/projects/$projectId", true, "org.project.overview"],
        ["org.project.overview", "/$orgId/projects/$projectId/", false, "org.project.overview"],
        ["org.project.settings", "/$orgId/projects/$projectId/settings", false, "org.project.settings"],
        ["org.project.document", "/$orgId/projects/$projectId/docs/$documentId", true, "org.project.document"],
        ["shareLink", "/d/$orgId/$projectId/$documentId", true, "shareLink"],
      ],
    );
    assert.deepEqual(graph.routes.find((route) => route.name === "org.project")?.component, {
      file: "src/pages/project.tsx",
      line: 13,
      component: "ProjectLayout",
    });
  });

  test("a route with an index child isn't a screen", () => {
    assert.deepEqual(screens(graph), [
      "root",
      "org.home",
      "org.members",
      "org.project.overview",
      "org.project.settings",
      "org.project.document",
      "shareLink",
    ]);
  });

  test("links know their component, targets, params and route", () => {
    assert.deepEqual(
      graph.links.find((link) => link.targets.includes("org.project.document")),
      {
        at: { file: "src/pages/project.tsx", line: 37, component: "ProjectOverview" },
        targets: ["org.project.document"],
        params: ["documentId"],
        shownBy: [{ route: "org.project.overview", as: "component" }],
      },
    );
  });

  test("a layout's links are on every screen below it; a link to a layout lands on its index", () => {
    assert.deepEqual(edges(graph), [
      "org.home → org.home",
      "org.home → org.members",
      "org.home → org.project.overview",
      "org.members → org.home",
      "org.members → org.members",
      "org.project.document → org.home",
      "org.project.document → org.members",
      "org.project.document → org.project.overview",
      "org.project.document → org.project.settings",
      "org.project.overview → org.home",
      "org.project.overview → org.members",
      "org.project.overview → org.project.document",
      "org.project.overview → org.project.overview",
      "org.project.overview → org.project.settings",
      "org.project.settings → org.home",
      "org.project.settings → org.members",
      "org.project.settings → org.project.overview",
      "org.project.settings → org.project.settings",
      "root → org.home",
      "shareLink → org.home",
    ]);
  });

  test("has no problems", () => {
    assert.deepEqual(graph.problems, []);
  });
});

describe("test/flows-app", () => {
  let graph: FlowGraph;
  before(() => {
    graph = extractFlows(at("../../test/flows-app/tsconfig.json"));
  });

  test("a pathless layout has no path and lands where its parent does", () => {
    const section = graph.routes.find((route) => route.name === "section");
    assert.equal(section?.path, undefined);
    assert.equal(section?.landsOn, "home");
    assert.deepEqual(screens(graph), ["home", "settings", "section.teams.list", "section.teams.team"]);
  });

  test("edges come from shared components, renamed imports and conditional targets", () => {
    assert.deepEqual(edges(graph), [
      // Nav, rendered by the root layout: on every screen.
      "home → home",
      "home → section.teams.list",
      // Home's conditional link.
      "home → settings",
      "section.teams.list → home",
      "section.teams.list → section.teams.list",
      // TeamList, through `Link as Go`.
      "section.teams.list → section.teams.team",
      "section.teams.team → home",
      "section.teams.team → section.teams.list",
      "settings → home",
      "settings → section.teams.list",
    ]);
  });

  test("a not-found page's links are placed, but make no edges", () => {
    const back = graph.links.find((link) => link.at.component === "Missing");
    assert.deepEqual(back?.shownBy, [{ route: "root", as: "notFound" }]);
  });

  test("reports links it can't place in the graph, and raw anchors", () => {
    assert.deepEqual(problems(graph), [
      "dynamic-link src/pages.tsx:44",
      "raw-anchor src/pages.tsx:21",
      "unplaced-link src/pages.tsx:53",
    ]);
  });
});
