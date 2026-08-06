import { JSDOM } from "jsdom";

/**
 * Minimal DOM globals so app modules (React components, UI libraries) can be
 * imported under vite-node. Import this FIRST, and load app code via dynamic
 * import() afterwards — a static import would hoist above this setup.
 */
if (typeof (globalThis as Record<string, unknown>).window === "undefined") {
  const dom = new JSDOM("<!doctype html><html><body></body></html>", { url: "http://localhost/" });
  const g = globalThis as Record<string, unknown>;
  g.window = dom.window;
  g.document = dom.window.document;
  g.localStorage = dom.window.localStorage;
  g.HTMLElement = dom.window.HTMLElement;
  g.CustomEvent = dom.window.CustomEvent;
  g.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
  // navigator is a read-only getter on newer Node — define, don't assign.
  Object.defineProperty(globalThis, "navigator", {
    value: dom.window.navigator,
    writable: true,
    configurable: true,
  });
  const matchMedia = () => ({
    matches: false,
    media: "",
    onchange: null,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
    dispatchEvent: () => false,
  });
  g.matchMedia ??= matchMedia;
  (dom.window as unknown as Record<string, unknown>).matchMedia ??= matchMedia;
}

export {};
