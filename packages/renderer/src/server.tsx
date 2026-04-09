import { renderToString } from "react-dom/server";
import type { PageDocument } from "@pagoda/schema";
import { ThemeProvider, themeToCSSString } from "./ThemeProvider.js";
import { RenderNode } from "./RenderNode.js";
import { collectResponsiveCSS } from "./StyleEngine.js";
import { getCriticalCSS } from "./critical-css.js";

/**
 * Renders a PageDocument to a full HTML document string.
 * Deterministic: same input always produces the same output.
 */
export function renderToHTML(doc: PageDocument): string {
  const { metadata, theme, body, symbols } = doc;

  // Render React tree to HTML string
  const bodyHTML = renderToString(
    <ThemeProvider theme={theme}>
      {body.map((node, index) => (
        <RenderNode key={node.id ?? index} node={node} symbols={symbols} />
      ))}
    </ThemeProvider>,
  );

  // Collect all CSS
  const themeCSS = themeToCSSString(theme);
  const responsiveCSS = collectResponsiveCSS(body);
  const criticalCSS = getCriticalCSS(theme);

  // Build <head> tags
  const metaTags = buildMetaTags(metadata);
  const fontLinks = buildFontLinks(metadata.fonts);
  const analyticsTag = metadata.analyticsId
    ? buildAnalyticsTag(metadata.analyticsId)
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHTML(metadata.title)}</title>
${metaTags}
${fontLinks}
${metadata.favicon ? `<link rel="icon" type="image/x-icon" href="${escapeAttr(metadata.favicon)}">
<link rel="shortcut icon" type="image/x-icon" href="${escapeAttr(metadata.favicon)}">
<link rel="apple-touch-icon" href="${escapeAttr(metadata.favicon)}">` : ""}
${analyticsTag}
<style>
${themeCSS}
${criticalCSS}
${responsiveCSS}
</style>
</head>
<body>
${bodyHTML}
</body>
</html>`;
}

function buildMetaTags(metadata: PageDocument["metadata"]): string {
  const tags: string[] = [];

  if (metadata.description) {
    tags.push(
      `<meta name="description" content="${escapeAttr(metadata.description)}">`,
    );
  }

  if (metadata.url) {
    tags.push(`<link rel="canonical" href="${escapeAttr(metadata.url)}">`);
  }

  if (metadata.og) {
    if (metadata.og.type)
      tags.push(
        `<meta property="og:type" content="${escapeAttr(metadata.og.type)}">`,
      );
    if (metadata.og.title)
      tags.push(
        `<meta property="og:title" content="${escapeAttr(metadata.og.title)}">`,
      );
    if (metadata.og.description)
      tags.push(
        `<meta property="og:description" content="${escapeAttr(metadata.og.description)}">`,
      );
    if (metadata.og.image)
      tags.push(
        `<meta property="og:image" content="${escapeAttr(metadata.og.image)}">`,
      );
  }

  if (metadata.twitter) {
    if (metadata.twitter.card)
      tags.push(
        `<meta name="twitter:card" content="${escapeAttr(metadata.twitter.card)}">`,
      );
    if (metadata.twitter.title)
      tags.push(
        `<meta name="twitter:title" content="${escapeAttr(metadata.twitter.title)}">`,
      );
    if (metadata.twitter.description)
      tags.push(
        `<meta name="twitter:description" content="${escapeAttr(metadata.twitter.description)}">`,
      );
    if (metadata.twitter.image)
      tags.push(
        `<meta name="twitter:image" content="${escapeAttr(metadata.twitter.image)}">`,
      );
  }

  return tags.join("\n");
}

function buildFontLinks(fonts?: string[]): string {
  if (!fonts || fonts.length === 0) return "";
  const families = fonts
    .map((f) => `family=${f.replace(/ /g, "+")}:wght@300;400;500;600;700;800`)
    .join("&");
  return `<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?${families}&display=swap">`;
}

function buildAnalyticsTag(analyticsId: string): string {
  // Support both UA- and G- format
  return `<script async src="https://www.googletagmanager.com/gtag/js?id=${escapeAttr(analyticsId)}"></script>
<script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag('js',new Date());gtag('config','${escapeAttr(analyticsId)}');</script>`;
}

function escapeHTML(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function escapeAttr(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
