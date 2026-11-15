// Puts the toolbar on the page: starts each app, then renders the toolbar into
// a shadow root, as a React root of its own.
import { createRoot } from "react-dom/client";
import type { AppHost, ToolbarApp } from "./app";
import type { SettingsStore } from "./settings";
import { createShell } from "./shell";
import { styles } from "./styles";
import { Toolbar, type MountedApp } from "./toolbar";

const tag = "spock-dev-toolbar";

class ToolbarElement extends HTMLElement {}

/** Adds the toolbar to the page. Does nothing if it's already there. */
export function mountToolbar(apps: ToolbarApp[], settings: SettingsStore): void {
  if (document.querySelector(tag)) return;
  if (!customElements.get(tag)) customElements.define(tag, ToolbarElement);

  const shell = createShell();
  const mounted = apps.map((app): MountedApp => ({ ...app, panel: document.createElement("div") }));
  for (const app of mounted) {
    const host: AppHost = {
      panel: app.panel,
      settings,
      notify: (on) => shell.notify(app.id, on),
      close: () => {
        if (shell.get().open === app.id) shell.setOpen(undefined);
      },
      get isOpen() {
        return shell.get().open === app.id;
      },
      onToggle: (listener) => shell.onToggle(app.id, listener),
    };
    app.init(host);
  }

  const element = document.createElement(tag);
  const shadow = element.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = styles;
  const container = document.createElement("div");
  shadow.append(style, container);
  document.body.append(element);
  createRoot(container).render(<Toolbar apps={mounted} settings={settings} shell={shell} />);
}
