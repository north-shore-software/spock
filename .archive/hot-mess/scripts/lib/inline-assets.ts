import fs from "node:fs";
import path from "node:path";

const MIME: Record<string, string> = {
  woff2: "font/woff2",
  woff: "font/woff",
  ttf: "font/ttf",
  otf: "font/otf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  svg: "image/svg+xml",
  webp: "image/webp",
  ico: "image/x-icon",
};

export type ResolveRef = (ref: string) => Buffer | null;

/**
 * Resolver over a Ladle/Vite build dir. Handles BOTH url shapes the compiled
 * CSS uses: absolute (`/assets/geist-*.woff2`, resolved from the build root)
 * and relative (`./x` or `x`, resolved from the assets dir). Resolving an
 * absolute ref with path.resolve(assetsDir, ref) is a silent no-op — that bug
 * shipped once; don't reintroduce it.
 */
export function buildDirResolver(buildDir: string): ResolveRef {
  return (ref) => {
    const clean = ref.split(/[?#]/)[0];
    const candidates = clean.startsWith("/")
      ? [path.join(buildDir, clean)]
      : [path.join(buildDir, "assets", clean), path.join(buildDir, clean)];
    for (const p of candidates) {
      if (fs.existsSync(p) && fs.statSync(p).isFile()) return fs.readFileSync(p);
    }
    return null;
  };
}

export function toDataUri(ref: string, buf: Buffer): string {
  const ext = path.extname(ref.split(/[?#]/)[0]).slice(1).toLowerCase();
  const mime = MIME[ext] ?? "application/octet-stream";
  return `data:${mime};base64,${buf.toString("base64")}`;
}

/** Rewrite every resolvable url(...) in CSS to a base64 data: URI. */
export function inlineCssUrls(css: string, resolve: ResolveRef, warnings: string[]): string {
  return css.replace(/url\(\s*(['"]?)([^)'"]+)\1\s*\)/g, (match, _quote, ref: string) => {
    if (/^(data:|https?:|#)/.test(ref)) return match;
    const buf = resolve(ref);
    if (!buf) {
      warnings.push(`unresolved css url(${ref})`);
      return match;
    }
    return `url('${toDataUri(ref, buf)}')`;
  });
}

/** Rewrite resolvable <img src>/<source src> refs in a body snapshot to data: URIs. */
export function inlineHtmlAssets(html: string, resolve: ResolveRef, warnings: string[]): string {
  return html.replace(/(\ssrc=")([^"]+)(")/g, (match, pre: string, ref: string, post: string) => {
    if (/^(data:|https?:|blob:)/.test(ref)) return match;
    const buf = resolve(ref);
    if (!buf) {
      warnings.push(`unresolved src ${ref}`);
      return match;
    }
    return pre + toDataUri(ref, buf) + post;
  });
}

export function stripScripts(html: string): string {
  return html.replace(/<script[\s\S]*?<\/script>/gi, "");
}

export type StandaloneHtmlInput = {
  title: string;
  /** Serialized attributes of the live <html> element (theme class, lang, …). */
  htmlAttrs: string;
  /** Serialized attributes of the live <body> element. */
  bodyAttrs: string;
  /** Full body snapshot — includes portal-rendered content. */
  bodyInnerHtml: string;
  /** Fully inlined stylesheets, in document order. */
  inlineStyles: string[];
};

/**
 * Compose a fully self-contained document: no scripts, no external requests.
 * html/body attributes are captured from the live page (never hardcoded) so
 * theme classes and inline styles survive the snapshot.
 */
export function buildStandaloneHtml(input: StandaloneHtmlInput): string {
  const styles = input.inlineStyles.map((css) => `<style>\n${css}\n</style>`).join("\n");
  return `<!DOCTYPE html>
<html ${input.htmlAttrs}>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${input.title}</title>
${styles}
</head>
<body ${input.bodyAttrs}>
${stripScripts(input.bodyInnerHtml)}
</body>
</html>`;
}
