// Toolbar settings, kept in localStorage so they survive reloads.

export type Placement = "bottom-left" | "bottom-center" | "bottom-right";
export const placements: readonly Placement[] = ["bottom-left", "bottom-center", "bottom-right"];

export type Settings = {
  placement: Placement;
  /** Tucked off screen; hovering the bottom edge brings it back. */
  hidden: boolean;
  /** Show badges on apps that have something to report. */
  notifications: boolean;
};

export type SettingsStore = {
  get(): Settings;
  set(patch: Partial<Settings>): void;
  /** Calls `listener` after each change. Returns an unsubscribe. */
  subscribe(listener: (settings: Settings) => void): () => void;
};

const key = "spock-toolbar:settings";
const defaults: Settings = { placement: "bottom-center", hidden: false, notifications: true };

export function createSettings(): SettingsStore {
  let value = load();
  const listeners = new Set<(settings: Settings) => void>();
  return {
    get: () => value,
    set(patch) {
      value = { ...value, ...patch };
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Storage can be full or blocked; the change still applies until reload.
      }
      for (const listener of listeners) listener(value);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

/** Saved settings, falling back to the default for anything missing or invalid. */
function load(): Settings {
  let saved: Partial<Record<keyof Settings, unknown>> = {};
  try {
    saved = JSON.parse(localStorage.getItem(key) ?? "{}") ?? {};
  } catch {
    // Unreadable: use the defaults.
  }
  return {
    placement: placements.includes(saved.placement as Placement) ? (saved.placement as Placement) : defaults.placement,
    hidden: typeof saved.hidden === "boolean" ? saved.hidden : defaults.hidden,
    notifications: typeof saved.notifications === "boolean" ? saved.notifications : defaults.notifications,
  };
}
