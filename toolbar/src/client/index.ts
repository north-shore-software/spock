// The toolbar's entry point, added to each page in dev by the Vite plugin.
import { routerApp } from "./apps/router";
import { settingsApp } from "./apps/settings";
import { stateApp } from "./apps/state";
import { createSettings } from "./settings";
import { mountToolbar } from "./mount";

// Settings stays last: the toolbar sets it apart from the other apps.
mountToolbar([routerApp, stateApp, settingsApp], createSettings());
