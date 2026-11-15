// The toolbar itself: a pill of app buttons at the bottom of the page, and a
// window above it for whichever app is open. It renders into a shadow root,
// so the page's styles and the toolbar's can't reach each other.
import type { AppHost, ToolbarApp } from "./app";
import { fromMarkup, h } from "./dom";
import { icons } from "./icons";
import type { Settings, SettingsStore } from "./settings";
import { styles } from "./styles";

const tag = "spock-dev-toolbar";

class ToolbarElement extends HTMLElement {}

/** Adds the toolbar to the page. Does nothing if it's already there. */
export function mountToolbar(apps: ToolbarApp[], settings: SettingsStore): void {
  if (document.querySelector(tag)) return;
  if (!customElements.get(tag)) customElements.define(tag, ToolbarElement);

  const element = document.createElement(tag);
  const shadow = element.attachShadow({ mode: "open" });
  const root = h("div", { class: "toolbar" });
  const bar = h("div", { class: "bar", role: "toolbar", "aria-label": "Spock dev toolbar" });
  // While hidden, hovering this strip along the bottom edge brings the bar back.
  const hitbox = h("div", { class: "hitbox", onmouseenter: () => root.toggleAttribute("data-peek", true) });
  root.addEventListener("mouseleave", () => root.removeAttribute("data-peek"));

  let open: string | undefined;
  const buttons = new Map<string, HTMLButtonElement>();
  const windows = new Map<string, HTMLElement>();

  function setOpen(id: string | undefined) {
    open = id;
    for (const [appId, button] of buttons) button.setAttribute("aria-pressed", String(appId === id));
    for (const [appId, win] of windows) win.hidden = appId !== id;
    root.toggleAttribute("data-open", id !== undefined);
  }

  apps.forEach((app, index) => {
    // The last app (Settings) sits apart from the rest, as in Astro's toolbar.
    if (index === apps.length - 1 && apps.length > 1) bar.append(h("div", { class: "separator" }));

    const button = h(
      "button",
      {
        class: "app",
        type: "button",
        "aria-label": app.name,
        "aria-pressed": "false",
        onclick: () => setOpen(open === app.id ? undefined : app.id),
      },
      fromMarkup(app.icon),
      h("span", { class: "badge" }),
      h("span", { class: "tooltip", "aria-hidden": "true" }, app.name),
    );
    const panel = h("div", { class: "window-body" });
    const win = h(
      "section",
      { class: "window", "aria-label": app.name, hidden: true },
      h(
        "header",
        {},
        h("h2", {}, app.name),
        h(
          "button",
          { class: "close", type: "button", "aria-label": `Close ${app.name}`, onclick: () => setOpen(undefined) },
          fromMarkup(icons.close),
        ),
      ),
      panel,
    );
    buttons.set(app.id, button);
    windows.set(app.id, win);
    bar.append(button);
    root.append(win);

    const host: AppHost = {
      panel,
      settings,
      notify: (on) => button.toggleAttribute("data-notify", on),
      close: () => {
        if (open === app.id) setOpen(undefined);
      },
    };
    app.init(host);
  });

  function apply(s: Settings) {
    root.dataset.placement = s.placement;
    root.toggleAttribute("data-hidden", s.hidden);
    root.toggleAttribute("data-quiet", !s.notifications);
  }
  apply(settings.get());
  settings.subscribe(apply);

  window.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && open !== undefined) setOpen(undefined);
  });

  root.append(hitbox, bar);
  shadow.append(h("style", {}, styles), root);
  document.body.append(element);
}
