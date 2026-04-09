import type { StyleObject, ResponsiveStyles } from "@pagoda/schema";
import { BREAKPOINTS } from "@pagoda/schema";

/**
 * Converts a camelCase CSS property name to kebab-case.
 * e.g. "backgroundColor" -> "background-color"
 */
function camelToKebab(str: string): string {
  return str.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);
}

/**
 * Converts a StyleObject to a CSS declaration block string.
 * e.g. { backgroundColor: "red", fontSize: "16px" } -> "background-color: red; font-size: 16px;"
 */
export function styleObjectToCSS(styles: StyleObject): string {
  const declarations: string[] = [];
  // Sort keys for deterministic output
  const sortedKeys = Object.keys(styles).sort();
  for (const key of sortedKeys) {
    const value = styles[key];
    if (value === undefined) continue;
    const prop = camelToKebab(key);
    const val = typeof value === "number" ? `${value}px` : value;
    declarations.push(`${prop}: ${val}`);
  }
  return declarations.join("; ");
}

/**
 * Generates scoped CSS media query rules for responsive style overrides.
 * Each rule targets [data-sr-id="<nodeId>"].
 */
export function generateResponsiveCSS(
  nodeId: string,
  responsiveStyles: ResponsiveStyles,
): string {
  const rules: string[] = [];

  if (responsiveStyles.mobile) {
    const css = styleObjectToCSS(responsiveStyles.mobile);
    if (css) {
      rules.push(
        `@media (max-width: ${BREAKPOINTS.mobile}px) { [data-sr-id="${nodeId}"] { ${css}; } }`,
      );
    }
  }

  if (responsiveStyles.tablet) {
    const css = styleObjectToCSS(responsiveStyles.tablet);
    if (css) {
      rules.push(
        `@media (min-width: ${BREAKPOINTS.mobile + 1}px) and (max-width: ${BREAKPOINTS.tablet}px) { [data-sr-id="${nodeId}"] { ${css}; } }`,
      );
    }
  }

  if (responsiveStyles.desktop) {
    const css = styleObjectToCSS(responsiveStyles.desktop);
    if (css) {
      rules.push(
        `@media (min-width: ${BREAKPOINTS.desktop}px) { [data-sr-id="${nodeId}"] { ${css}; } }`,
      );
    }
  }

  return rules.join("\n");
}

/**
 * Collects all responsive CSS from a node tree into a single string.
 */
export function collectResponsiveCSS(
  nodes: readonly { id?: string; responsiveStyles?: ResponsiveStyles; children?: readonly { id?: string; responsiveStyles?: ResponsiveStyles; children?: unknown[] }[] }[],
): string {
  const cssBlocks: string[] = [];

  function walk(nodeList: readonly { id?: string; responsiveStyles?: ResponsiveStyles; children?: readonly unknown[] }[]) {
    for (const node of nodeList) {
      if (node.id && node.responsiveStyles) {
        const css = generateResponsiveCSS(node.id, node.responsiveStyles);
        if (css) cssBlocks.push(css);
      }
      if (node.children && Array.isArray(node.children)) {
        walk(node.children as typeof nodeList);
      }
    }
  }

  walk(nodes);
  return cssBlocks.join("\n");
}
