/**
 * TypeScript mirror of the existing preview_input JSON shape.
 * Field names use snake_case to match the current Python API contract.
 */

export interface PreviewInputColor {
  primary_color: string;
  secondary_color: string;
}

export interface PreviewInputFont {
  primary_font: string;
  secondary_font: string;
}

export interface PreviewInputHeroSection {
  header: string;
  subhead?: string;
  include_book_now_button?: boolean;
  image?: string;
  /** Rich HTML content */
  text?: string | null;
  book_link_copy?: string;
}

export interface PreviewInputOurServices {
  header: string;
  subtitle?: string | null;
  /** Legacy rich text field */
  subtext?: string | null;
  /** Legacy default text field */
  default?: string | null;
  /** Rich HTML body text (new field) */
  body?: string | null;
  menu_note?: string | null;
}

export interface PreviewInputServiceHighlight {
  icon: string;
  title: string;
  body: string;
}

export interface PreviewInputServiceHighlights {
  highlights: PreviewInputServiceHighlight[];
}

export interface PreviewInputTestimonial {
  name: string;
  content: string;
  picture?: string | null;
  source?: string;
}

export interface PreviewInputTestimonials {
  title: string;
  subtitle?: string;
  /** Rich HTML intro text */
  text?: string | null;
  testimonials: PreviewInputTestimonial[];
}

export interface PreviewInputGalleryItem {
  image_url: string;
  title: string;
  description?: string | null;
}

export interface PreviewInputGallery {
  title: string;
  items: PreviewInputGalleryItem[];
  grid_layout?: string;
}

export interface PreviewInputBanner {
  title?: string | null;
  content: string;
  text_color: string;
  background_color: string;
}

export interface PreviewInputTeam {
  title?: string;
  /** Rich HTML text */
  text: string;
}

export interface PreviewInputSocials {
  instagram_url?: string | null;
  facebook_url?: string | null;
  twitter_url?: string | null;
  tiktok_url?: string | null;
}

export interface PreviewInputFindUs {
  title: string;
  subtitle?: string | null;
  google_maps: boolean;
}

export interface PreviewInputBookingLink {
  url: string;
  title?: string;
}

export interface PreviewInputAnnouncementModal {
  title: string;
  body: string;
  items?: string[];
  call_to_action?: string;
  background_color?: string;
  text_color?: string;
}

/**
 * Complete preview_input shape as sent by the frontend.
 * Matches the current Python PreviewInputModel contract.
 */
export interface PreviewInput {
  company_name?: string;
  color: PreviewInputColor;
  font: PreviewInputFont;
  hero_section: PreviewInputHeroSection;
  our_services: PreviewInputOurServices;
  service_highlights?: PreviewInputServiceHighlights;
  testimonials?: PreviewInputTestimonials;
  gallery?: PreviewInputGallery;
  banner?: PreviewInputBanner;
  team?: PreviewInputTeam;
  socials?: PreviewInputSocials;
  find_us: PreviewInputFindUs;
  booking_link: PreviewInputBookingLink;
  announcement_modal?: PreviewInputAnnouncementModal;
}
