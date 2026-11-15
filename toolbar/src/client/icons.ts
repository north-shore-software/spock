// 24×24 line icons, drawn in `currentColor`.
const icon = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  // A route tree: a trunk with a branch off to the right.
  router: icon(
    `<circle cx="6" cy="5" r="2"/><circle cx="6" cy="19" r="2"/><circle cx="18" cy="12" r="2"/><path d="M6 7v10"/><path d="M6 8c0 3 2.5 4 6 4h4"/>`,
  ),
  // A stack of records.
  state: icon(
    `<ellipse cx="12" cy="6" rx="7" ry="3"/><path d="M5 6v6c0 1.66 3.13 3 7 3s7-1.34 7-3V6"/><path d="M5 12v6c0 1.66 3.13 3 7 3s7-1.34 7-3v-6"/>`,
  ),
  // Sliders.
  settings: icon(
    `<path d="M4 6h9M17 6h3M4 12h3M11 12h9M4 18h11M19 18h1"/><circle cx="15" cy="6" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="17" cy="18" r="2"/>`,
  ),
  // A pointer over a dashed selection box.
  select: icon(
    `<path d="M9 3H5a2 2 0 0 0-2 2v4M3 15v4a2 2 0 0 0 2 2h4M15 3h4a2 2 0 0 1 2 2v4"/><path d="M12 12l3.5 9 1.6-4.4L21.5 15z"/>`,
  ),
  // Four corners pointing out.
  fullscreen: icon(`<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>`),
  chevron: icon(`<path d="M9 6l6 6-6 6"/>`),
  close: icon(`<path d="M6 6l12 12M18 6L6 18"/>`),
};
