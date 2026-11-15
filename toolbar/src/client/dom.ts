// A tiny element builder for the apps' panels, which are still plain DOM.
// The toolbar around them is React (toolbar.tsx).

type Prop = string | number | boolean | undefined | ((event: Event) => void);
export type Child = Node | string | number | null | undefined | false;

/**
 * `h("button", { class: "x", onclick: fn }, "Label")`. Keys starting with `on`
 * add listeners; `true` sets an empty attribute; `false` and `undefined` skip it.
 */
export function h<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Record<string, Prop> = {},
  ...children: Child[]
): HTMLElementTagNameMap[K] {
  const element = document.createElement(tag);
  for (const [key, value] of Object.entries(props)) {
    if (value === undefined || value === false) continue;
    if (typeof value === "function") element.addEventListener(key.slice(2), value);
    else element.setAttribute(key, value === true ? "" : String(value));
  }
  for (const child of children) {
    if (child === null || child === undefined || child === false) continue;
    element.append(typeof child === "number" ? String(child) : child);
  }
  return element;
}

/** An element from trusted markup, e.g. one of the toolbar's own icons. */
export function fromMarkup(markup: string): Element {
  const template = document.createElement("template");
  template.innerHTML = markup.trim();
  return template.content.firstElementChild!;
}
