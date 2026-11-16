#!/usr/bin/env node
// `spock-flows [tsconfig] [--json | --mermaid]`: prints the app's user-flow
// graph, and exits with 1 if anything stops it from being complete, so CI can
// run it. The tsconfig defaults to `tsconfig.app.json` in the current directory.
import { parseArgs } from "node:util";
import { extractFlows, type FlowGraph, type FlowRoute } from "./index.ts";

const { values, positionals } = parseArgs({
  allowPositionals: true,
  options: { json: { type: "boolean" }, mermaid: { type: "boolean" } },
});
const graph = extractFlows(positionals[0] ?? "tsconfig.app.json");

if (values.json) console.log(JSON.stringify(graph, null, 2));
else if (values.mermaid) console.log(mermaid(graph));
else console.log(summary(graph));

if (graph.problems.length > 0) {
  // With --json or --mermaid, stdout is the output; problems go to stderr.
  if (values.json || values.mermaid) console.error(problems(graph));
  process.exitCode = 1;
}

function summary(graph: FlowGraph): string {
  const screens = graph.routes.filter((route) => route.screen);
  const width = Math.max(...screens.map((route) => route.name.length));
  const lines = [
    `${graph.routes.length} routes, ${screens.length} screens, ${graph.links.length} links, ${graph.edges.length} edges`,
    "",
  ];
  for (const screen of screens) {
    const to = graph.edges.filter((edge) => edge.from === screen.name && edge.to !== screen.name).map((edge) => edge.to);
    lines.push(`${screen.name.padEnd(width)}  ${screen.path}`);
    if (to.length > 0) lines.push(`${"".padEnd(width)}  → ${to.join(", ")}`);
  }
  if (graph.problems.length > 0) lines.push("", problems(graph));
  return lines.join("\n");
}

function problems(graph: FlowGraph): string {
  return [
    `${graph.problems.length} problem${graph.problems.length === 1 ? "" : "s"}:`,
    ...graph.problems.map(({ kind, message, at }) => {
      const where = `${at.file}:${at.line}${at.component ? ` (${at.component})` : ""}`;
      return `  ${where}  ${kind}: ${message}`;
    }),
  ].join("\n");
}

/**
 * A Mermaid flowchart: screens are nodes, routes with children are subgraphs.
 * Links from a screen to itself (the active nav item) are left out.
 */
function mermaid(graph: FlowGraph): string {
  const byName = new Map(graph.routes.map((route) => [route.name, route]));
  const id = (name: string) => name.replace(/\W/g, "_");
  const lines = ["flowchart LR"];
  const emit = (route: FlowRoute, indent: string) => {
    const node = `${indent}${id(route.name)}["${route.name}<br/><small>${route.path}</small>"]`;
    if (route.children.length === 0) {
      if (route.screen) lines.push(node);
      return;
    }
    lines.push(`${indent}subgraph ${id(route.name)}_group["${route.name}"]`);
    if (route.screen) lines.push(`  ${node}`);
    for (const child of route.children) emit(byName.get(child)!, `${indent}  `);
    lines.push(`${indent}end`);
  };
  const root = graph.routes.find((route) => route.parent === undefined);
  if (root) emit(root, "  ");
  for (const edge of graph.edges) {
    if (edge.from !== edge.to) lines.push(`  ${id(edge.from)} --> ${id(edge.to)}`);
  }
  return lines.join("\n");
}
