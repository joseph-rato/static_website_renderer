export { transform } from "./transform.js";

// Legacy type re-exports for consumers that need to construct input data
export type { PreviewInput } from "./legacy-types/preview-input.js";
export type { DatabaseData } from "./legacy-types/database-data.js";

// Section builders for advanced usage (e.g. building partial trees)
export {
  buildAnnouncementModal,
  buildNavigation,
  buildHero,
  buildServicesMenu,
  buildServiceHighlights,
  buildTeam,
  buildTestimonials,
  buildGallery,
  buildFindUs,
  buildFooter,
  buildMetadata,
} from "./section-builders/index.js";
