// The toolbar's stylesheet, scoped by its shadow root. Apps' panels are styled
// here too, since they render into the same root.
export const styles = /* css */ `
:host {
  all: initial;
}

.toolbar {
  --bg: #17191f;
  --bg-raised: #20232b;
  --bg-hover: #2a2e38;
  --border: #343844;
  --text: #e7e9ef;
  --text-dim: #9aa0ad;
  --accent: #6ea8fe;
  --accent-soft: rgb(110 168 254 / 0.16);
  --danger: #f2626b;
  --edge: 16px;
  --bar-height: 44px;

  font: 13px/1.45 system-ui, -apple-system, "Segoe UI", sans-serif;
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

*, *::before, *::after {
  box-sizing: border-box;
}

button {
  font: inherit;
  color: inherit;
}

code {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
}

/* ---- Placement ------------------------------------------------------- */

.bar,
.window,
.hitbox {
  position: fixed;
  z-index: 2147483646;
}
.toolbar[data-placement="bottom-center"] :is(.bar, .window, .hitbox) {
  left: 50%;
  translate: -50% 0;
}
.toolbar[data-placement="bottom-left"] :is(.bar, .window, .hitbox) {
  left: var(--edge);
}
.toolbar[data-placement="bottom-right"] :is(.bar, .window, .hitbox) {
  right: var(--edge);
}

/* ---- Bar ------------------------------------------------------------- */

.bar {
  bottom: var(--edge);
  display: flex;
  align-items: center;
  gap: 2px;
  height: var(--bar-height);
  padding: 4px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 999px;
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35), 0 1px 2px rgb(0 0 0 / 0.3);
  transition: transform 0.25s ease, opacity 0.25s ease;
}

.separator {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--border);
}

.app {
  position: relative;
  display: grid;
  place-items: center;
  width: 44px;
  height: 100%;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.app:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.app:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.app[aria-pressed="true"] {
  background: var(--accent-soft);
  color: var(--accent);
}
/* The open app's indicator, under its icon. */
.app[aria-pressed="true"]::after {
  content: "";
  position: absolute;
  bottom: 3px;
  width: 14px;
  height: 2px;
  border-radius: 1px;
  background: var(--accent);
}

.badge {
  position: absolute;
  top: 6px;
  right: 10px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--danger);
  box-shadow: 0 0 0 2px var(--bg);
  display: none;
}
.app[data-notify] .badge {
  display: block;
}
.toolbar[data-quiet] .badge {
  display: none;
}

.tooltip {
  position: absolute;
  bottom: calc(100% + 12px);
  left: 50%;
  translate: -50% 4px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 6px;
  background: var(--bg);
  color: var(--text);
  font-size: 12px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s, translate 0.15s;
}
.app:is(:hover, :focus-visible):not([aria-pressed="true"]) .tooltip {
  opacity: 1;
  translate: -50% 0;
}

/* ---- Hidden ---------------------------------------------------------- */

.hitbox {
  bottom: 0;
  width: 240px;
  height: 0;
}
.toolbar[data-hidden] .hitbox {
  height: calc(var(--edge) + 8px);
}
.toolbar[data-hidden]:not([data-peek], [data-open]) .bar {
  transform: translateY(calc(100% + var(--edge) + 4px));
  opacity: 0;
  pointer-events: none;
}

/* ---- Window ---------------------------------------------------------- */

.window {
  bottom: calc(var(--edge) + var(--bar-height) + 12px);
  display: flex;
  flex-direction: column;
  width: min(640px, calc(100vw - 2 * var(--edge)));
  max-height: min(560px, calc(100vh - var(--bar-height) - 4 * var(--edge)));
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 16px 40px rgb(0 0 0 / 0.4);
  overflow: hidden;
}
.window[hidden] {
  display: none;
}
.window > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 10px 10px 16px;
  border-bottom: 1px solid var(--border);
}
.window h2 {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
}
.close {
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
}
.close:hover {
  background: var(--bg-hover);
  color: var(--text);
}
.close svg {
  width: 16px;
  height: 16px;
}
.window-body {
  padding: 4px 16px 16px;
  overflow: auto;
}

/* ---- Panel building blocks ------------------------------------------- */

.section {
  margin-top: 14px;
}
.section > h3 {
  margin: 0 0 6px;
  color: var(--text-dim);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}
.empty {
  margin: 14px 0 0;
  color: var(--text-dim);
}
.dim {
  color: var(--text-dim);
}
.tag {
  padding: 0 6px;
  border-radius: 4px;
  background: var(--bg-hover);
  color: var(--text-dim);
  font-size: 11px;
}
.tag.danger {
  background: rgb(242 98 107 / 0.15);
  color: var(--danger);
}
.banner {
  margin-top: 14px;
  padding: 8px 12px;
  border: 1px solid rgb(242 98 107 / 0.4);
  border-radius: 8px;
  background: rgb(242 98 107 / 0.1);
  color: var(--danger);
}

/* ---- Router app ------------------------------------------------------ */

.location {
  display: block;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--bg-raised);
  overflow-wrap: anywhere;
}

.matches {
  width: 100%;
  border-collapse: collapse;
}
.matches th {
  padding: 4px 8px 4px 0;
  color: var(--text-dim);
  font-weight: 500;
  text-align: left;
}
.matches td {
  padding: 5px 8px 5px 0;
  border-top: 1px solid var(--border);
  vertical-align: top;
}
.matches tr:last-child td:first-child code {
  color: var(--accent);
}
.param + .param {
  margin-left: 8px;
}

.routes {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.route {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  /* Room on the left for the active dot, which sits in the padding. */
  padding: 4px 8px 4px calc(22px + var(--depth) * 16px);
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
}
button.route {
  cursor: pointer;
}
button.route:hover {
  background: var(--bg-hover);
}
button.route:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
div.route .route-name {
  color: var(--text-dim);
}
.route .route-path {
  margin-left: auto;
  color: var(--text-dim);
}
.route.active .route-name {
  color: var(--text);
}
.route.active::before {
  content: "";
  flex: none;
  width: 6px;
  height: 6px;
  margin-left: -14px;
  border-radius: 50%;
  background: var(--accent);
}
.route.current {
  background: var(--accent-soft);
}
.route.current .route-name {
  color: var(--accent);
  font-weight: 600;
}

/* ---- Settings app ---------------------------------------------------- */

.setting {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 0;
  border-top: 1px solid var(--border);
}
.setting:first-child {
  border-top: 0;
}
.setting-label {
  font-weight: 500;
}
.setting-hint {
  color: var(--text-dim);
  font-size: 12px;
}

.segmented {
  display: flex;
  flex: none;
  padding: 2px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg-raised);
}
.segmented button {
  padding: 4px 10px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--text-dim);
  cursor: pointer;
}
.segmented button:hover {
  color: var(--text);
}
.segmented button[aria-checked="true"] {
  background: var(--bg-hover);
  color: var(--text);
}

.switch {
  position: relative;
  flex: none;
  width: 36px;
  height: 20px;
  padding: 0;
  border: 0;
  border-radius: 999px;
  background: var(--bg-hover);
  cursor: pointer;
  transition: background 0.15s;
}
.switch::after {
  content: "";
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--text-dim);
  transition: translate 0.15s, background 0.15s;
}
.switch[aria-checked="true"] {
  background: var(--accent);
}
.switch[aria-checked="true"]::after {
  translate: 16px 0;
  background: #fff;
}
:is(.segmented button, .switch):focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  * {
    transition: none !important;
  }
}
`;
