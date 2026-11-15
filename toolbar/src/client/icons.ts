// 24×24 line icons, drawn in `currentColor`.
const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  // A route tree: a trunk with a branch off to the right.
  router: icon(
    `<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10"/><path d="M6 8c0 3 2.5 4 6 4h4"/>`,
  ),
  // Sliders.
  settings: icon(
    `<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>`,
  ),
  close: icon(`<path d="M6 6l12 12M18 6L6 18"/>`),
};
