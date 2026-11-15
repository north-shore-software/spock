# spock brand kit

Everything needed to put the spock brand on the website, docs and repo. Drop this `brand/` folder anywhere in the repo (for a Vite app, `public/brand/` lets you serve the files as-is).

**The idea: outlines first, then colour.** spock is about drawing the outlines of an app before colouring it in, and the brand follows the same rule. Line illustration and an even-stroke wordmark on lots of white space, with ink for structure, blue for things that are decided, and amber *only* for placeholders.

```
brand/
├── logo/          wordmark + lockups, SVG (text outlined, no font needed) and PNG
├── illustration/  the line illustration: original, plus transparent ink / white / blue PNGs
├── icons/         favicon.ico/svg, PNG sizes, apple-touch, maskable, webmanifest
├── social/        og-image.png (1200×630)
├── fonts/         self-hosted woff2 (Comfortaa, Inter, JetBrains Mono) + licences
└── tokens/        tokens.css, fonts.css, tokens.json, tailwind.preset.js
```

---

## Logo

| File | Use it for |
|---|---|
| `logo/svg/spock-lockup-horizontal.svg` | Website header on large screens, README banner, slides |
| `logo/svg/spock-lockup-stacked.svg` | Square spaces: splash, footer, social avatars |
| `…-reversed.svg` | The same, white on Spock Blue |
| `logo/svg/spock-wordmark-blue.svg` | Nav bar, docs header, anywhere tight |
| `logo/svg/spock-wordmark-bold-*.svg` | The wordmark below 20px tall |

Wordmark colours: `blue` (default), `ink` (one-colour print, mono contexts), `white` (on blue or ink only).

**Rules**

- The wordmark is always lowercase: **spock**, never "Spock" or "SPOCK", in the logo. In running text, "spock" lowercase is preferred too.
- Weight goes up as size goes down: Regular at 32px and taller, SemiBold 20–31px, Bold under 20px. The thin stroke breaks up when small.
- Clear space: the height of the "o" on every side.
- Don't recolour outside the palette, stretch, add effects or outline the wordmark. Don't set "spock" in Comfortaa yourself as a logo; use the SVGs (they're outlined paths, so they render identically everywhere).
- Reversed versions go on Spock Blue (`#3D5AFE`) or Ink (`#141420`) only.

README banner:

```md
<p align="center"><img src="brand/logo/png/spock-lockup-horizontal.png" alt="spock" width="560"></p>
```

## Illustration

`illustration/spock-illustration-ink.png` is the default: transparent background, ink lines, so it sits on any light ground. Use `-white.png` on blue or ink, `-blue.png` for a single-colour accent. `-original.jpg` is the untouched source.

Give it room; it's a line drawing, so it needs white space around it. Don't put it on photos or busy backgrounds, and don't fill or colour it in. That's the point.

## Colour

| Token | Hex | Use |
|---|---|---|
| Spock Blue | `#3D5AFE` | Wordmark, primary buttons, links, anything *decided*. 5.2:1 on white (AA). |
| Blue Deep | `#2A3FD1` | Hover and pressed states. 7.7:1 on white. |
| Blue 200 | `#CFD6FF` | Focus rings, text selection. |
| Mist | `#F4F6FF` | Alternating section bands, code blocks. |
| Ink | `#141420` | Body text, outlines, illustration. |
| Slate | `#5A5A6E` | Secondary text. 6.7:1 on white. |
| Line | `#E6E8F0` | Hairlines, card borders. |
| Paper | `#FFFFFF` | Background. Use lots of it. |
| Placeholder Amber | `#FFB020` | **Placeholders only.** |

**Amber has one job.** It marks things that aren't decided yet, always paired with a dashed ink outline (`.spock-placeholder` in `tokens.css`). Use it for "experimental" tags, TBD states in diagrams and wireframes, and work-in-progress docs. Never use it decoratively, and never as text on white (1.8:1, unreadable). That way a placeholder can never be mistaken for a decision, which is the product in one colour.

## Typography

| Role | Font | Spec |
|---|---|---|
| Display | Comfortaa 600 | 72px / 1.05, −0.01em |
| H2 | Comfortaa 600 | 44px / 1.1 |
| H3 | Inter 600 | 24px / 1.3 |
| Body | Inter 400 | 18px / 1.6 |
| Small | Inter 500 | 14px / 1.5 |
| Code | JetBrains Mono 400 | 15px / 1.6 |

Comfortaa is the wordmark's typeface, so it's for headlines only (32px+, short lines). Everything people actually read is Inter. Commands, package names (`@spock/router`) and code are JetBrains Mono.

All three fonts are self-hosted in `fonts/` (latin subset) under the SIL Open Font License; the licence files sit beside them. No Google Fonts request needed.

## Using the tokens

**Plain CSS**

```css
@import "./brand/tokens/fonts.css";
@import "./brand/tokens/tokens.css";

body { font: var(--spock-text-body); color: var(--spock-ink); background: var(--spock-paper); }
h1   { font: var(--spock-text-display); }
a    { color: var(--spock-blue); }
a:hover { color: var(--spock-blue-deep); }
```

**Tailwind v3**: `presets: [require("./brand/tokens/tailwind.preset.js")]`, then `text-spock-blue`, `font-display`, `text-display`, etc.

**Tailwind v4**: import `fonts.css` and `tokens.css`, then map what you need:

```css
@theme {
  --color-spock-blue: var(--spock-blue);
  --color-spock-ink: var(--spock-ink);
  --font-display: var(--spock-font-display);
  --font-sans: var(--spock-font-body);
}
```

**Anything else**: `tokens/tokens.json` has the same values.

## Favicons and meta tags

Assuming the folder is served at `/brand/`:

```html
<link rel="icon" href="/brand/icons/favicon.ico" sizes="48x48">
<link rel="icon" href="/brand/icons/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/brand/icons/apple-touch-icon.png">
<link rel="manifest" href="/brand/icons/site.webmanifest">
<meta name="theme-color" content="#3D5AFE">

<meta property="og:title" content="spock">
<meta property="og:description" content="Make greenfield development with coding agents feel telepathic.">
<meta property="og:image" content="https://YOUR-DOMAIN/brand/social/og-image.png">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta name="twitter:card" content="summary_large_image">
```

If you serve the folder somewhere other than `/brand/`, update the paths in `icons/site.webmanifest` too. `og:image` must be an absolute URL.

`icon-outline.svg` and `icon-ink.svg` are alternates for light documentation UIs and dark tab bars; the solid blue icon is the default everywhere else.

## Voice

Copy that's already on-brand, from the project's own README:

- **Line:** Make greenfield development with coding agents feel telepathic.
- **Tag:** Draw the outlines first. Then colour them in.
- **Problem in one line:** The code is the context. The context is polluted.

British spelling ("colour"), plain words, short sentences, a dry joke now and then. Honest about being experimental.
