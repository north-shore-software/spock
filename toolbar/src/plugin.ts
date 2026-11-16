// The Vite plugin. In dev it adds the toolbar's client script to every page,
// and keeps the app's flow graph current for the Flows app; `vite build`
// never runs it, so production output has no toolbar.
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { openFlows, type FlowProblem, type FlowsSession } from "@spock/router/flows";
import type { Plugin, ViteDevServer } from "vite";
import { flowsEvent, flowsRequest, type FlowsMessage } from "./flows-message.ts";

const client = fileURLToPath(new URL("./client/index.ts", import.meta.url));

export type SpockToolbarOptions = {
  /**
   * The tsconfig the flow graph is read with, relative to Vite's root.
   * Defaults to `tsconfig.app.json` if there is one, else `tsconfig.json`.
   */
  tsconfig?: string;
};

export function spockToolbar(options: SpockToolbarOptions = {}): Plugin {
  return {
    name: "spock-toolbar",
    apply: "serve",
    transformIndexHtml: () => [
      // `/@fs/` serves a file by absolute path, so the client loads from this
      // package wherever the app lives.
      { tag: "script", attrs: { type: "module", src: `/@fs${client}` }, injectTo: "body" },
    ],
    configureServer(server) {
      const root = server.config.root;
      const tsconfig = options.tsconfig
        ? resolve(root, options.tsconfig)
        : [resolve(root, "tsconfig.app.json"), resolve(root, "tsconfig.json")].find((file) => existsSync(file));
      if (tsconfig) serveFlows(server, tsconfig);
    },
  };
}

/** How long after the last file change the graph is read again. */
const settleMs = 150;

/**
 * Reads the flow graph once the server is up, again after files change, and
 * sends it to the toolbar whenever it's different. Problems are also logged,
 * when they change, so they show up without the toolbar open.
 */
function serveFlows(server: ViteDevServer, tsconfig: string) {
  const root = dirname(tsconfig);
  const { logger } = server.config;
  let session: FlowsSession | undefined;
  let message: FlowsMessage | undefined;
  let sent: string | undefined;
  let loggedProblems = "";
  let timer: ReturnType<typeof setTimeout> | undefined;

  function refresh() {
    timer = undefined;
    try {
      session ??= openFlows(tsconfig);
      const graph = session.extract();
      message = { graph, root };
      logProblems(graph.problems);
    } catch (error) {
      session?.close();
      session = undefined;
      message = { error: error instanceof Error ? error.message : String(error) };
      logger.warn(`[spock] Couldn't read the flow graph: ${message.error}`, { timestamp: true });
    }
    const json = JSON.stringify(message);
    if (json !== sent) {
      sent = json;
      server.ws.send(flowsEvent, message);
    }
  }

  function logProblems(problems: FlowProblem[]) {
    const text = format(problems);
    if (text === loggedProblems) return;
    loggedProblems = text;
    if (text) logger.warn(text, { timestamp: true });
    else logger.info("[spock] Flow graph: no problems", { timestamp: true });
  }

  const schedule = () => {
    clearTimeout(timer);
    timer = setTimeout(refresh, settleMs);
  };
  const isSource = (file: string) => /\.[cm]?tsx?$/.test(file) && !file.includes("/node_modules/");
  const watch = (kind: "changed" | "created" | "deleted") => (file: string) => {
    if (!isSource(file)) return;
    session?.update({ [kind]: [file] });
    schedule();
  };
  server.watcher.on("change", watch("changed"));
  server.watcher.on("add", watch("created"));
  server.watcher.on("unlink", watch("deleted"));

  // A toolbar that loads after the last change asks for the graph.
  server.ws.on(flowsRequest, (_data, client) => {
    if (message) client.send(flowsEvent, message);
  });

  server.httpServer?.once("listening", schedule);
  if (!server.httpServer) schedule();
  server.httpServer?.once("close", () => {
    clearTimeout(timer);
    session?.close();
  });
}

function format(problems: FlowProblem[]): string {
  if (problems.length === 0) return "";
  return [
    `[spock] Flow graph: ${problems.length} problem${problems.length === 1 ? "" : "s"}`,
    ...problems.map(({ kind, message, at }) => `  ${at.file}:${at.line}  ${kind}: ${message}`),
  ].join("\n");
}
