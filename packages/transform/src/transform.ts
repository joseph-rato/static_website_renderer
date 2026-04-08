import type { PageDocument, SRNode, NavLink } from "@pagoda/schema";
import { SCHEMA_VERSION } from "@pagoda/schema";
import type { PreviewInput } from "./legacy-types/preview-input.js";
import type { DatabaseData } from "./legacy-types/database-data.js";
import {
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

/**
 * Derives navigation links from which optional sections are present.
 */
function deriveNavLinks(previewInput: PreviewInput): NavLink[] {
  const links: NavLink[] = [
    { label: "Home", anchor: "#home" },
    { label: "Services", anchor: "#services" },
  ];

  if (previewInput.team) {
    links.push({ label: "About", anchor: "#about" });
  }

  if (previewInput.testimonials) {
    links.push({ label: "Testimonials", anchor: "#testimonials" });
  }

  return links;
}

/**
 * Transform legacy data (preview_input + database_data) into a PageDocument.
 *
 * This is a pure function with zero side effects. The existing API contracts
 * (preview_input shape from the frontend, database_data from the backend)
 * remain unchanged.
 */
export function transform(
  previewInput: PreviewInput,
  databaseData: DatabaseData
): PageDocument {
  const { metadata, theme } = buildMetadata(previewInput, databaseData);
  const navLinks = deriveNavLinks(previewInput);
  const companyName = previewInput.company_name ?? databaseData.company_name;
  const bookingUrl = previewInput.booking_link.url;

  // Build body sections in render order
  const body: SRNode[] = [];

  // 1. Announcement modal (conditional)
  if (previewInput.announcement_modal) {
    body.push(buildAnnouncementModal(previewInput.announcement_modal));
  }

  // 2. Navigation (always, with optional banner child)
  body.push(
    buildNavigation(
      databaseData.logo_data,
      previewInput.booking_link,
      navLinks,
      previewInput.banner
    )
  );

  // 3. Hero (always)
  body.push(buildHero(previewInput.hero_section, bookingUrl));

  // 4. Services menu (always)
  body.push(
    buildServicesMenu(
      previewInput.our_services,
      databaseData.services_data.services,
      bookingUrl
    )
  );

  // 5. Service highlights (conditional)
  if (previewInput.service_highlights) {
    body.push(buildServiceHighlights(previewInput.service_highlights));
  }

  // 6. Team (conditional)
  if (previewInput.team) {
    body.push(
      buildTeam(previewInput.team, databaseData.staff_data.staff_members)
    );
  }

  // 7. Testimonials (conditional)
  if (previewInput.testimonials) {
    body.push(buildTestimonials(previewInput.testimonials));
  }

  // 8. Gallery (conditional)
  if (previewInput.gallery) {
    body.push(buildGallery(previewInput.gallery));
  }

  // 9. Find Us (always)
  body.push(
    buildFindUs(
      previewInput.find_us,
      databaseData.contact_details,
      databaseData.location_data,
      previewInput.socials
    )
  );

  // 10. Footer (always)
  body.push(
    buildFooter(
      companyName,
      databaseData.contact_details,
      bookingUrl,
      previewInput.socials
    )
  );

  return {
    schemaVersion: SCHEMA_VERSION,
    metadata,
    theme,
    body,
  };
}
