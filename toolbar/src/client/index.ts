// The toolbar's entry point, added to each page in dev by the Vite plugin.
import { routerApp } from "./apps/router";
import { settingsApp } from "./apps/settings";
import { createSettings } from "./settings";
import { mountToolbar } from "./toolbar";

// Settings stays last: the toolbar sets it apart from the other apps.
mountToolbar([routerApp, settingsApp], createSettings());
