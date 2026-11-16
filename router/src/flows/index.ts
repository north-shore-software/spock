// The app's user-flow graph, read from its source: the screens in the route
// tree, and the `<Link>`s that lead from one to another. Node-only; the
// toolbar's Vite plugin and the CLI use it, apps never import it.
//
// It runs on TypeScript's own API (`typescript/unstable/*`), against the app's
// tsconfig, so imports resolve exactly as they do for `tsc`. That also gives
// it `Link`'s inferred `to`: the type checker has already worked out which
// routes each link can go to.
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import * as ts from "typescript/unstable/ast";
import {
  API,
  SymbolFlags,
  TypeFlags,
  type Checker,
  type Project,
  type Snapshot,
  type StringLiteralType,
  type Type,
  type UnionType,
} from "typescript/unstable/sync";
import { paramNames } from "../paths.ts";

/** Where something is written. `file` is relative to the tsconfig's directory. */
export type SourceRef = { file: string; line: number; component?: string };

export type FlowRoute = {
  name: string;
  /** Full path, e.g. `/$orgId/projects/$projectId`. Pathless layouts have none. */
  path: string | undefined;
  params: string[];
  /** Has its own `data` selector. */
  bound: boolean;
  parent: string | undefined;
  children: string[];
  /**
   * Can be the deepest match, i.e. a page you can be on. A route with an index
   * child isn't one: its URL lands on the index child.
   */
  screen: boolean;
  /** The screen a link to this route lands on. */
  landsOn: string | undefined;
  /** The route's `component`, when it's a component declared in the app. */
  component: SourceRef | undefined;
};

/** One `<Link>` in the source. */
export type FlowLink = {
  at: SourceRef;
  /** The route names `to` can be, as written. */
  targets: string[];
  /** The keys of `params`, when it's an object literal. */
  params: string[] | undefined;
  /**
   * The routes whose component renders this link, directly or through other
   * components, and whether it's their `component` or their `notFound`. A
   * route's component is shown on every screen below it.
   */
  shownBy: { route: string; as: "component" | "notFound" }[];
};

/** Screen `from` has links that land on screen `to`. Not-found pages have no edges. */
export type FlowEdge = { from: string; to: string; links: number[] };

export type FlowProblem = {
  kind:
    | "no-router" // no `createRouter` call in the app
    | "tree" // part of the route tree isn't written out, so it can't be read
    | "dynamic-link" // a Link's `to` isn't a string literal, or a choice between them
    | "unplaced-link" // a Link in a component that no route renders
    | "raw-anchor"; // an `<a href>` that may navigate inside the app
  message: string;
  at: SourceRef;
};

export type FlowGraph = {
  routes: FlowRoute[];
  links: FlowLink[];
  edges: FlowEdge[];
  problems: FlowProblem[];
};

export type FileChanges = { changed?: string[]; created?: string[]; deleted?: string[] };

export type FlowsSession = {
  /** Reads the graph from the app's source as it is now. */
  extract(): FlowGraph;
  /** Records changed files; the next `extract` reads them again. Paths are absolute. */
  update(changes: FileChanges): void;
  close(): void;
};

// The declarations the extractor looks for, by file. TypeScript reports
// declarations at their real path, and so does `import.meta.url`, so the
// pnpm symlinks between them don't matter.
const LINK_FILE = fileURLToPath(new URL("../components.tsx", import.meta.url));
const CREATE_ROUTER_FILE = fileURLToPath(new URL("../router.ts", import.meta.url));

/** Opens a TypeScript session on the app's tsconfig, e.g. `tsconfig.app.json`. */
export function openFlows(tsconfig: string): FlowsSession {
  const configFile = resolve(tsconfig);
  const api = new API({ cwd: dirname(configFile) });
  let snapshot: Snapshot | undefined;
  let pending: FileChanges | undefined;
  return {
    extract() {
      const next = api.updateSnapshot({
        openProjects: [configFile],
        ...(snapshot && pending && { fileChanges: pending }),
      });
      snapshot?.dispose();
      snapshot = next;
      pending = undefined;
      const project = snapshot.getProject(configFile);
      if (!project) throw new Error(`flows: TypeScript didn't load ${configFile}`);
      return extractFrom(project, dirname(configFile));
    },
    update(changes) {
      pending = {
        changed: [...(pending?.changed ?? []), ...(changes.changed ?? [])],
        created: [...(pending?.created ?? []), ...(changes.created ?? [])],
        deleted: [...(pending?.deleted ?? []), ...(changes.deleted ?? [])],
      };
    },
    close() {
      snapshot?.dispose();
      api.close();
    },
  };
}

/** Opens a session, extracts the graph once and closes it. */
export function extractFlows(tsconfig: string): FlowGraph {
  const session = openFlows(tsconfig);
  try {
    return session.extract();
  } finally {
    session.close();
  }
}

/** A route as read from the tree literal, before screens are worked out. */
type TreeRoute = {
  name: string;
  /** As written, relative to the parent. */
  ownPath: string | undefined;
  /** The parent's for a pathless layout. */
  fullPath: string;
  bound: boolean;
  parent: TreeRoute | undefined;
  children: TreeRoute[];
  component: ts.Node | undefined;
  notFound: ts.Node | undefined;
};

function extractFrom(project: Project, root: string): FlowGraph {
  const { program, checker } = project;
  const problems: FlowProblem[] = [];
  const isAppFile = (file: string) => file.startsWith(root + "/") && !file.includes("/node_modules/");
  const files = program
    .getSourceFileNames()
    .filter(isAppFile)
    .map((file) => program.getSourceFile(file))
    .filter((file): file is ts.SourceFile => file !== undefined && !file.isDeclarationFile);

  const ref = (node: ts.Node, component?: ts.Node): SourceRef => {
    const file = node.getSourceFile();
    const line = lineOf(file, node.getStart(file));
    const name = component && nameOf(component);
    return { file: relative(root, file.fileName), line, ...(name && { component: name }) };
  };

  /** The declaration an identifier (or JSX tag) refers to, through imports. */
  const declarationOf = (node: ts.Node): ts.Node | undefined => {
    let symbol = checker.getSymbolAtLocation(node);
    if (!symbol) return undefined;
    if (symbol.flags & SymbolFlags.Alias) symbol = checker.getAliasedSymbol(symbol);
    return (symbol.valueDeclaration ?? symbol.declarations[0])?.resolve(project);
  };
  const isDeclared = (decl: ts.Node | undefined, file: string, name: string) =>
    decl !== undefined && decl.getSourceFile().fileName === file && nameOf(decl) === name;

  // One pass over the app: the router call, the links, the raw anchors, and
  // which app component renders which.
  let treeArg: ts.Node | undefined;
  const found: { node: ts.JsxOpeningElement | ts.JsxSelfClosingElement; in: ts.Node | undefined }[] = [];
  const renders = new Map<string, Set<ts.Node>>();
  for (const file of files) {
    const visit = (node: ts.Node): void => {
      if (ts.isCallExpression(node) && isDeclared(declarationOf(node.expression), CREATE_ROUTER_FILE, "createRouter")) {
        if (treeArg) problems.push({ kind: "tree", message: "More than one createRouter call; reading the first", at: ref(node) });
        else treeArg = node.arguments[0];
      }
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const component = enclosingComponent(node);
        if (ts.isIdentifier(node.tagName) && /^[a-z]/.test(node.tagName.text)) {
          if (node.tagName.text === "a") checkAnchor(node, component);
        } else {
          const decl = declarationOf(node.tagName);
          if (isDeclared(decl, LINK_FILE, "Link")) found.push({ node, in: component });
          else if (decl && component && isAppFile(decl.getSourceFile().fileName)) {
            const target = topLevel(decl);
            if (target) getOrCreate(renders, keyOf(component), () => new Set()).add(target);
          }
        }
      }
      node.forEachChild(visit);
    };
    visit(file);
  }

  function checkAnchor(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, component: ts.Node | undefined) {
    const href = attribute(node, "href");
    if (!href) return;
    const value = href.initializer && literalOf(href.initializer);
    if (value !== undefined && isExternal(value)) return;
    problems.push({
      kind: "raw-anchor",
      message:
        value === undefined
          ? "<a> with a computed href; if it can point inside the app, use <Link>"
          : `<a href="${value}"> navigates inside the app; use <Link> with a route name`,
      at: ref(node, component),
    });
  }

  // The route tree.
  const routes: TreeRoute[] = [];
  if (!treeArg) {
    problems.push({ kind: "no-router", message: "No createRouter call found", at: { file: ".", line: 1 } });
  } else {
    readRoute(treeArg, "root", undefined);
  }

  function readRoute(node: ts.Node, name: string, parent: TreeRoute | undefined) {
    if (!ts.isObjectLiteralExpression(node)) {
      problems.push({ kind: "tree", message: `Route "${name}" isn't an object literal`, at: ref(node) });
      return;
    }
    const route: TreeRoute = {
      name,
      ownPath: undefined,
      fullPath: parent?.fullPath ?? "/",
      bound: false,
      parent,
      children: [],
      component: undefined,
      notFound: undefined,
    };
    routes.push(route);
    parent?.children.push(route);
    let children: ts.ObjectLiteralExpression | undefined;
    for (const property of node.properties) {
      const key = ts.isPropertyAssignment(property) ? propertyName(property.name) : undefined;
      if (!ts.isPropertyAssignment(property) || key === undefined) {
        problems.push({ kind: "tree", message: `Route "${name}": write each property out as \`key: value\``, at: ref(property) });
        continue;
      }
      const value = property.initializer;
      if (key === "path") {
        const path = literalOf(value);
        if (path === undefined) problems.push({ kind: "tree", message: `Route "${name}": path isn't a string literal`, at: ref(value) });
        else if (parent) {
          route.ownPath = path;
          route.fullPath = joinPath(parent.fullPath, path);
        }
      } else if (key === "component" || key === "notFound") {
        const decl = declarationOf(value);
        const component = decl && topLevel(decl);
        if (component && isAppFile(component.getSourceFile().fileName)) route[key] = component;
      } else if (key === "data") {
        route.bound = true;
      } else if (key === "children") {
        if (ts.isObjectLiteralExpression(value)) children = value;
        else problems.push({ kind: "tree", message: `Route "${name}": children isn't an object literal`, at: ref(value) });
      }
    }
    for (const property of children?.properties ?? []) {
      const key = ts.isPropertyAssignment(property) ? propertyName(property.name) : undefined;
      if (!ts.isPropertyAssignment(property) || key === undefined) {
        problems.push({ kind: "tree", message: `Route "${name}": write each child out as \`name: { ... }\``, at: ref(property) });
        continue;
      }
      readRoute(property.initializer, name === "root" ? key : `${name}.${key}`, route);
    }
  }

  const byName = new Map(routes.map((route) => [route.name, route]));
  const landsOn = new Map<TreeRoute, TreeRoute | undefined>();
  const landing = (route: TreeRoute): TreeRoute | undefined =>
    getOrCreate(landsOn, route, () => {
      // A pathless layout has its parent's URL.
      if (route.ownPath === undefined && route.parent) return landing(route.parent);
      const index = indexChild(route);
      return index ? landingOfIndex(index) : route;
    });
  // The index child of a route: one with path "/", possibly inside pathless layouts.
  function indexChild(route: TreeRoute): TreeRoute | undefined {
    for (const child of route.children) {
      if (child.ownPath === "/") return child;
      if (child.ownPath === undefined) {
        const nested = indexChild(child);
        if (nested) return nested;
      }
    }
    return undefined;
  }
  const landingOfIndex = (index: TreeRoute): TreeRoute => {
    const deeper = indexChild(index);
    return deeper ? landingOfIndex(deeper) : index;
  };
  const isScreen = (route: TreeRoute) => (route.ownPath !== undefined || !route.parent) && landing(route) === route;

  // Where each component is shown: the routes that render it, directly or
  // through the components they render.
  const shownBy = new Map<string, FlowLink["shownBy"]>();
  for (const route of routes) {
    for (const as of ["component", "notFound"] as const) {
      const start = route[as];
      if (!start) continue;
      const seen = new Set<string>();
      const walk = (component: ts.Node) => {
        const key = keyOf(component);
        if (seen.has(key)) return;
        seen.add(key);
        getOrCreate(shownBy, key, () => []).push({ route: route.name, as });
        for (const next of renders.get(key) ?? []) walk(next);
      };
      walk(start);
    }
  }

  // The links.
  const links: FlowLink[] = [];
  for (const { node, in: component } of found) {
    const at = ref(node, component);
    const to = attribute(node, "to");
    const expression = to?.initializer && (ts.isJsxExpression(to.initializer) ? to.initializer.expression : to.initializer);
    if (!expression || !isWrittenOut(expression)) {
      problems.push({
        kind: "dynamic-link",
        message: "Link's `to` must be a route name written out, or a choice between written-out names",
        at,
      });
      continue;
    }
    const targets = linkTargets(checker, node);
    const params = attribute(node, "params")?.initializer;
    const paramsObject = params && ts.isJsxExpression(params) ? params.expression : undefined;
    const placed = (component && shownBy.get(keyOf(component))) ?? [];
    if (placed.length === 0) {
      problems.push({
        kind: "unplaced-link",
        message: "This Link is in a component no route renders, so it's not on any screen",
        at,
      });
    }
    links.push({
      at,
      targets,
      params:
        paramsObject && ts.isObjectLiteralExpression(paramsObject)
          ? paramsObject.properties.flatMap((property) => {
              const name = "name" in property && property.name ? propertyName(property.name as ts.Node) : undefined;
              return name === undefined ? [] : [name];
            })
          : undefined,
      shownBy: placed,
    });
  }

  // The edges: each link, from every screen its component is shown on, to
  // where each of its targets lands.
  const edges = new Map<string, FlowEdge>();
  const screensUnder = (route: TreeRoute): TreeRoute[] => [
    ...(isScreen(route) ? [route] : []),
    ...route.children.flatMap(screensUnder),
  ];
  links.forEach((link, index) => {
    for (const { route: name, as } of link.shownBy) {
      if (as !== "component") continue;
      for (const from of screensUnder(byName.get(name)!)) {
        for (const target of link.targets) {
          const to = byName.get(target);
          const lands = to && landing(to);
          if (!lands) continue;
          const edge = getOrCreate(edges, `${from.name}\0${lands.name}`, () => ({ from: from.name, to: lands.name, links: [] }));
          if (!edge.links.includes(index)) edge.links.push(index);
        }
      }
    }
  });

  return {
    routes: routes.map((route) => ({
      name: route.name,
      path: route.ownPath !== undefined || !route.parent ? route.fullPath : undefined,
      params: paramNames(route.fullPath),
      bound: route.bound,
      parent: route.parent?.name,
      children: route.children.map((child) => child.name),
      screen: isScreen(route),
      landsOn: landing(route)?.name,
      component: route.component && ref(route.component, route.component),
    })),
    links,
    edges: [...edges.values()],
    problems,
  };
}

/** The route names a Link's `to` was inferred as. */
function linkTargets(checker: Checker, node: ts.Node): string[] {
  const signature = checker.getResolvedSignature(node);
  const props = signature && checker.getParameterType(signature, 0);
  const to = props && checker.getPropertyOfType(props, "to");
  const type = to && checker.getTypeOfSymbol(to);
  if (!type) return [];
  const types: readonly Type[] = type.flags & TypeFlags.Union ? (type as UnionType).getTypes() : [type];
  return types.flatMap((t) => (t.flags & TypeFlags.StringLiteral ? [(t as StringLiteralType).value] : []));
}

/** A string literal, or a choice between them: what a Link's `to` may be. */
function isWrittenOut(node: ts.Node): boolean {
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return true;
  if (ts.isParenthesizedExpression(node)) return isWrittenOut(node.expression);
  if (ts.isConditionalExpression(node)) return isWrittenOut(node.whenTrue) && isWrittenOut(node.whenFalse);
  return false;
}

/** `https:`, `mailto:`, `//host` and `#fragment` don't navigate the app. */
const isExternal = (href: string) => /^([a-z][a-z0-9+.-]*:|\/\/|#)/i.test(href);

function attribute(node: ts.JsxOpeningElement | ts.JsxSelfClosingElement, name: string): ts.JsxAttribute | undefined {
  for (const property of node.attributes.properties) {
    if (ts.isJsxAttribute(property) && ts.isIdentifier(property.name) && property.name.text === name) return property;
  }
  return undefined;
}

/** The text of a string literal, also inside `{...}`. */
function literalOf(node: ts.Node): string | undefined {
  if (ts.isJsxExpression(node)) return node.expression ? literalOf(node.expression) : undefined;
  if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) return node.text;
  return undefined;
}

function propertyName(node: ts.Node): string | undefined {
  if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
  return undefined;
}

/**
 * The top-level declaration a node is inside: a function, or one variable of
 * a `const` statement, e.g. `export const OrgLayout = page(function ...)`.
 */
function enclosingComponent(node: ts.Node): ts.Node | undefined {
  let statement = node;
  while (statement.parent && !ts.isSourceFile(statement.parent)) statement = statement.parent;
  if (ts.isFunctionDeclaration(statement)) return statement;
  if (ts.isVariableStatement(statement)) {
    return statement.declarationList.declarations.find((decl) => decl.pos <= node.pos && node.end <= decl.end);
  }
  return undefined;
}

/** A declaration, if it's a top-level function or variable. */
function topLevel(decl: ts.Node): ts.Node | undefined {
  if (ts.isFunctionDeclaration(decl) && ts.isSourceFile(decl.parent)) return decl;
  if (ts.isVariableDeclaration(decl) && enclosingComponent(decl) === decl) return decl;
  return undefined;
}

/**
 * Identifies a declaration. The node a symbol resolves to may be a different
 * object from the one the visitor saw, so they're compared by position.
 */
const keyOf = (decl: ts.Node) => `${decl.getSourceFile().fileName}:${decl.pos}`;

function nameOf(decl: ts.Node): string | undefined {
  const name = (decl as { name?: ts.Node }).name;
  return name && ts.isIdentifier(name) ? name.text : undefined;
}

/** How TanStack joins paths: `/` + `$orgId` → `/$orgId`; an index child adds a trailing `/`. */
function joinPath(parent: string, path: string): string {
  const base = parent === "/" ? "" : parent.replace(/\/$/, "");
  if (path === "/") return base + "/";
  return `${base}/${path.replace(/^\/+|\/+$/g, "")}`;
}

function lineOf(file: ts.SourceFile, position: number): number {
  let line = 1;
  for (let i = 0; i < position; i++) if (file.text.charCodeAt(i) === 10) line++;
  return line;
}

function getOrCreate<K, V>(map: Map<K, V>, key: K, create: () => V): V {
  if (!map.has(key)) map.set(key, create());
  return map.get(key)!;
}
