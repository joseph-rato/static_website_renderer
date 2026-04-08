/**
 * CSS-in-JS style object. camelCase property names, string or number values.
 * Maps directly to React's CSSProperties.
 */
export type StyleObject = {
  [key: string]: string | number | undefined;
};

/**
 * Breakpoint names used in the responsive system.
 *
 * Mobile-first approach:
 *  - Base `styles` apply at all viewports
 *  - `mobile` overrides apply at viewport <= 768px
 *  - `tablet` overrides apply at viewport 769–1024px
 *  - `desktop` overrides apply at viewport >= 1025px
 *
 * For SSR, desktop styles are the default and media queries
 * are emitted for tablet and mobile overrides.
 */
export type Breakpoint = "mobile" | "tablet" | "desktop";

/**
 * Responsive style overrides keyed by breakpoint.
 * Each entry is a partial StyleObject that gets merged on top
 * of the base `styles` at the matching viewport width.
 */
export type ResponsiveStyles = {
  [K in Breakpoint]?: StyleObject;
};
