/** Current schema version. Follows semver. */
export const SCHEMA_VERSION = "1.0.0";

/** Viewport breakpoint thresholds in pixels. */
export const BREAKPOINTS = {
  /** Max-width for mobile viewport */
  mobile: 768,
  /** Max-width for tablet viewport */
  tablet: 1024,
  /** Min-width for desktop viewport */
  desktop: 1025,
} as const;

/** All recognized component type strings. */
export const COMPONENT_TYPES = {
  // Primitives
  div: "div",
  section: "section",
  span: "span",
  heading: "heading",
  text: "text",
  richText: "rich-text",
  image: "image",
  link: "link",
  icon: "icon",

  // Layout
  flexContainer: "flex-container",
  gridContainer: "grid-container",
  container: "container",

  // Salon domain
  hero: "hero",
  navigation: "navigation",
  banner: "banner",
  announcementModal: "announcement-modal",
  servicesMenu: "services-menu",
  serviceHighlights: "service-highlights",
  team: "team",
  testimonials: "testimonials",
  gallery: "gallery",
  findUs: "find-us",
  footer: "footer",

  // Special
  symbolRef: "symbol-ref",
} as const;

/** Union type of all valid component type strings. */
export type ComponentType = (typeof COMPONENT_TYPES)[keyof typeof COMPONENT_TYPES];

/** Constraints for array-based component props. */
export const CONSTRAINTS = {
  /** Service highlights: min 1, max 4 items */
  serviceHighlights: { min: 1, max: 4 },
  /** Testimonials: max 5 items */
  testimonials: { max: 5 },
  /** Gallery: max 12 items */
  gallery: { max: 12 },
} as const;
