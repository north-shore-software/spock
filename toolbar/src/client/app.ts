// What a toolbar app is. Internal for now: the toolbar's own apps are listed
// in index.ts, and nothing else can add one yet.
import type { SettingsStore } from "./settings";

export type ToolbarApp = {
  id: string;
  /** Shown in the tooltip and as the window title. */
  name: string;
  /** SVG markup, drawn in `currentColor`. */
  icon: string;
  /** Called once, when the toolbar mounts. Fill `host.panel` and keep it current. */
  init(host: AppHost): void;
};

export type AppHost = {
  /** The app's window body. It stays in the DOM while the window is closed. */
  readonly panel: HTMLElement;
  readonly settings: SettingsStore;
  /** Shows or clears the badge on the app's button. */
  notify(on: boolean): void;
  /** Closes the app's window, if it's open. */
  close(): void;
  readonly isOpen: boolean;
  /** Calls `listener` when the app's window opens or closes. */
  onToggle(listener: (open: boolean) => void): void;
};
