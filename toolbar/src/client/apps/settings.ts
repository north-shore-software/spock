// The Settings app: where the toolbar sits, whether apps show badges, and
// hiding the toolbar until you hover the bottom edge.
import type { ToolbarApp } from "../app";
import { h } from "../dom";
import { icons } from "../icons";
import { placements, type Placement, type Settings } from "../settings";

const placementLabels: Record<Placement, string> = {
  "bottom-left": "Left",
  "bottom-center": "Center",
  "bottom-right": "Right",
};

export const settingsApp: ToolbarApp = {
  id: "settings",
  name: "Settings",
  icon: icons.settings,
  init(host) {
    const { settings } = host;

    const placementButtons = placements.map((placement) =>
      h(
        "button",
        { type: "button", role: "radio", onclick: () => settings.set({ placement }) },
        placementLabels[placement],
      ),
    );
    const notifications = h("button", {
      class: "switch",
      type: "button",
      role: "switch",
      "aria-label": "Notifications",
      onclick: () => settings.set({ notifications: !settings.get().notifications }),
    });
    const hidden = h("button", {
      class: "switch",
      type: "button",
      role: "switch",
      "aria-label": "Hide toolbar",
      onclick: () => {
        const hide = !settings.get().hidden;
        settings.set({ hidden: hide });
        if (hide) host.close();
      },
    });

    host.panel.replaceChildren(
      setting(
        "Placement",
        "Where the toolbar sits along the bottom of the page.",
        h("div", { class: "segmented", role: "radiogroup", "aria-label": "Placement" }, ...placementButtons),
      ),
      setting("Notifications", "Show a badge on an app when it has something to report.", notifications),
      setting("Hide toolbar", "Tuck it away. Hover the bottom edge of the page to bring it back.", hidden),
    );

    // Update in place rather than re-rendering, so focus stays where it was.
    function sync(s: Settings) {
      placementButtons.forEach((button, index) =>
        button.setAttribute("aria-checked", String(placements[index] === s.placement)),
      );
      notifications.setAttribute("aria-checked", String(s.notifications));
      hidden.setAttribute("aria-checked", String(s.hidden));
    }
    sync(settings.get());
    settings.subscribe(sync);
  },
};

function setting(label: string, hint: string, control: HTMLElement) {
  return h(
    "div",
    { class: "setting" },
    h("div", {}, h("div", { class: "setting-label" }, label), h("div", { class: "setting-hint" }, hint)),
    control,
  );
}
