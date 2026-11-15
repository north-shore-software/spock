// The Vite plugin. In dev it adds the toolbar's client script to every page;
// `vite build` never runs it, so production output has no toolbar.
import { fileURLToPath } from "node:url";
import type { Plugin } from "vite";

const client = fileURLToPath(new URL("./client/index.ts", import.meta.url));

export function spockToolbar(): Plugin {
  return {
    name: "spock-toolbar",
    apply: "serve",
    transformIndexHtml: () => [
      // `/@fs/` serves a file by absolute path, so the client loads from this
      // package wherever the app lives.
      { tag: "script", attrs: { type: "module", src: `/@fs${client}` }, injectTo: "body" },
    ],
  };
}
