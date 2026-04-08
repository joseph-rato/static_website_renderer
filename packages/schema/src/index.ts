// Types
export type {
  PageDocument,
  SRNode,
  StyleObject,
  Breakpoint,
  ResponsiveStyles,
  PageMetadata,
  OpenGraphMetadata,
  TwitterMetadata,
  ThemeTokens,
  NavigationProps,
  NavLink,
  BannerProps,
  AnnouncementModalProps,
  HeroProps,
  ServicesMenuProps,
  ServiceGroup,
  ServiceItem,
  ServiceHighlightsProps,
  ServiceHighlight,
  TeamProps,
  TeamMember,
  TestimonialsProps,
  Testimonial,
  GalleryProps,
  GalleryItem,
  FindUsProps,
  FooterProps,
  SocialLinks,
  HeadingProps,
  TextProps,
  RichTextProps,
  ImageProps,
  LinkProps,
  IconProps,
  FlexContainerProps,
  GridContainerProps,
  ContainerProps,
  SymbolRefProps,
} from "./types/index.js";

// Constants
export {
  SCHEMA_VERSION,
  BREAKPOINTS,
  COMPONENT_TYPES,
  CONSTRAINTS,
} from "./constants.js";
export type { ComponentType } from "./constants.js";

// Validation
export { validatePageDocument, type ValidationResult } from "./validators/validate.js";
