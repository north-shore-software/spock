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

/* Wraps an icon's SVG markup; lays out as if the SVG were bare. */
.icon {
  display: contents;
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
.toolbar[data-hidden]:not([data-peek], [data-open], [data-overlay], [data-picking]) .bar {
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

/* ---- Overlay --------------------------------------------------------- */

/* Covers the whole viewport, solid, under the bar so the bar stays usable. */
.overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483645;
  display: flex;
  flex-direction: column;
  background: var(--bg);
}
.overlay[hidden] {
  display: none;
}
.overlay > header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 12px 24px;
  border-bottom: 1px solid var(--border);
}
.overlay h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
}
.overlay-body {
  flex: 1;
  /* Clear of the bar, which floats over the bottom of the overlay. */
  padding: 8px 24px calc(var(--bar-height) + 2 * var(--edge) + 16px);
  overflow: auto;
  overscroll-behavior: contain;
}

/* ---- Element picker -------------------------------------------------- */

/* Both ignore the pointer, so hit testing reaches the page under them. */
.pick-box,
.pick-label {
  position: fixed;
  z-index: 2147483645;
  pointer-events: none;
}
.pick-box {
  border: 1.5px solid var(--accent);
  background: rgb(110 168 254 / 0.12);
}
.pick-label {
  display: flex;
  gap: 6px;
  max-width: 320px;
  padding: 2px 6px;
  border-radius: 4px;
  background: var(--accent);
  color: #0b1220;
  font: 500 12px/18px ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  white-space: nowrap;
  translate: 0 calc(-100% - 4px);
}
.pick-label[data-inside] {
  translate: 4px 4px;
}
.pick-component {
  overflow: hidden;
  text-overflow: ellipsis;
  font-weight: 700;
}
.pick-tag {
  opacity: 0.7;
}

/* ---- Toast ----------------------------------------------------------- */

.toast {
  position: fixed;
  z-index: 2147483646;
  bottom: calc(var(--edge) + var(--bar-height) + 12px);
  left: 50%;
  translate: -50% 0;
  padding: 6px 12px;
  border: 1px solid var(--border);
  border-radius: 8px;
  background: var(--bg);
  color: var(--text);
  box-shadow: 0 8px 24px rgb(0 0 0 / 0.35);
  pointer-events: none;
  animation: toast 2s ease forwards;
}
.toast[data-error] {
  color: var(--danger);
}
@keyframes toast {
  from {
    opacity: 0;
    translate: -50% 4px;
  }
  10%,
  85% {
    opacity: 1;
    translate: -50% 0;
  }
  to {
    opacity: 0;
  }
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

/* ---- Flows app ------------------------------------------------------- */

.flow-focus {
  display: flex;
  align-items: baseline;
  gap: 10px;
  padding: 6px 10px;
  border-radius: 6px;
  background: var(--bg-raised);
}
.flow-name {
  color: var(--accent);
  font-weight: 600;
}
.flow-follow {
  margin-left: auto;
}
.flow-edges {
  display: flex;
  flex-direction: column;
}
.flow-edge {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding: 5px 0;
  border-top: 1px solid var(--border);
}
.flow-edge:first-child {
  border-top: 0;
}
.flow-sources {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  margin-left: auto;
}
.flow-screen,
.flow-source,
.flow-follow,
.flow-go {
  padding: 1px 6px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}
.flow-screen {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
}
.flow-screen.here {
  color: var(--accent);
}
.flow-screen.focus {
  background: var(--accent-soft);
}
.flow-follow,
.flow-go {
  color: var(--accent);
}
.flow-screen:hover,
.flow-source:hover,
.flow-follow:hover,
.flow-go:hover {
  background: var(--bg-hover);
}
.flow-screen:focus-visible,
.flow-source:focus-visible,
.flow-follow:focus-visible,
.flow-go:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.flow-problems {
  margin: 6px 0 0;
  padding-left: 0;
  list-style: none;
}
.flow-problems .flow-source {
  color: inherit;
}
.flow-table {
  width: 100%;
  border-collapse: collapse;
}
.flow-table th {
  padding: 4px 8px 4px 0;
  color: var(--text-dim);
  font-weight: 500;
  text-align: left;
}
.flow-table td {
  padding: 3px 8px 3px 0;
  border-top: 1px solid var(--border);
}

/* ---- State app ------------------------------------------------------- */

.bound-list {
  display: flex;
  flex-direction: column;
  gap: 1px;
}
.bound-item {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 4px 8px;
  border: 0;
  border-radius: 6px;
  background: transparent;
  text-align: left;
}
button.bound-item {
  cursor: pointer;
}
button.bound-item:hover {
  background: var(--bg-hover);
}
.bound-route {
  min-width: 140px;
}
.bound-path {
  color: var(--text-dim);
}
.bound-item .tag {
  margin-left: auto;
}

.tag.bound {
  background: var(--accent-soft);
  color: var(--accent);
}

.tree {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 12px;
}
.tree .row {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  min-height: 24px;
  padding: 2px 8px 2px calc(4px + var(--depth) * 16px);
  border: 0;
  border-radius: 4px;
  background: transparent;
  font: inherit;
  text-align: left;
  white-space: nowrap;
}
.tree .branch {
  cursor: pointer;
}
.tree .branch:hover {
  background: var(--bg-hover);
}
.tree .branch:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}
.tree .current {
  background: var(--accent-soft);
}
.chevron,
.spacer {
  flex: none;
  display: grid;
  place-items: center;
  width: 16px;
  color: var(--text-dim);
}
.chevron svg {
  width: 12px;
  height: 12px;
  transition: rotate 0.12s;
}
.branch[aria-expanded="true"] .chevron svg {
  rotate: 90deg;
}
.key {
  color: var(--text);
}
.key.index {
  color: var(--text-dim);
}
.colon {
  margin-right: 4px;
  color: var(--text-dim);
}
.preview {
  margin-left: 6px;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-dim);
}
.tree .tag {
  margin-left: 6px;
  font-family: system-ui, sans-serif;
}
.value {
  overflow: hidden;
  text-overflow: ellipsis;
}
.value.string {
  color: #9ece6a;
}
.value.number {
  color: #ff9e64;
}
.value.keyword {
  color: #bb9af7;
}
.tree .changed {
  animation: changed 1s ease-out;
}
@keyframes changed {
  from {
    background: rgb(110 168 254 / 0.35);
  }
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
