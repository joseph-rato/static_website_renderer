import type { StyleObject, ResponsiveStyles } from "./styles.js";

/**
 * SRNode — Static Renderer Node.
 *
 * Every element in the page tree is one of these. This is the fundamental
 * unit of the page schema, analogous to a React element or VDOM node.
 *
 * The `type` field is a discriminator that maps to a component in the
 * renderer's component registry.
 */
export interface SRNode {
  /**
   * Component type discriminator. Maps to a component in the registry.
   *
   * Primitives:  "div", "section", "span", "heading", "text",
   *              "rich-text", "image", "link", "icon"
   * Layout:      "flex-container", "grid-container", "container"
   * Salon:       "hero", "navigation", "services-menu", "service-highlights",
   *              "team", "testimonials", "gallery", "find-us", "footer",
   *              "banner", "announcement-modal"
   * Special:     "symbol-ref"
   */
  type: string;

  /** Stable unique identifier for this node. Used for React keys, anchors, and testing. */
  id?: string;

  /**
   * Props passed to the component. Shape depends on `type`.
   * Primitives have generic HTML-like props.
   * Salon components have domain-specific typed props.
   */
  props?: Record<string, unknown>;

  /** Base styles applied at all viewport widths. camelCase CSS property names. */
  styles?: StyleObject;

  /** Responsive style overrides merged on top of base `styles` per breakpoint. */
  responsiveStyles?: ResponsiveStyles;

  /** CSS class names to apply (for utility classes or theme-level styles). */
  className?: string;

  /** Child nodes. Leaf nodes (text, image, icon) typically have no children. */
  children?: SRNode[];

  /**
   * Visibility flag. When false, the node and its subtree are not rendered.
   * When omitted or true, the node is rendered normally.
   */
  visible?: boolean;
}
