// =============================================================================
// Salon Domain Component Props
// =============================================================================

export interface NavLink {
  label: string;
  anchor: string;
}

export interface NavigationProps {
  logoUrl?: string;
  logoAlt?: string;
  bookingUrl?: string;
  bookButtonText?: string;
  /** Auto-derived from which sections are visible in the page */
  navLinks?: NavLink[];
}

export interface BannerProps {
  title?: string;
  /** Rich HTML content */
  content: string;
  textColor?: string;
  backgroundColor?: string;
}

export interface AnnouncementModalProps {
  title: string;
  /** Rich HTML body content */
  body: string;
  items?: string[];
  callToAction?: string;
  backgroundColor?: string;
  textColor?: string;
}

export interface HeroProps {
  header: string;
  subhead?: string;
  imageUrl?: string;
  /** Rich HTML content from text editor */
  richText?: string;
  showBookButton?: boolean;
  bookButtonText?: string;
  bookingUrl?: string;
}

export interface ServiceItem {
  id: number | string;
  name: string;
  description?: string;
  price: number;
  isVariablePrice: boolean;
  durationMins: number;
}

export interface ServiceGroup {
  /** Service category (e.g. "Hair", "Spa", "Nails") */
  category: string;
  services: ServiceItem[];
}

export interface ServicesMenuProps {
  title: string;
  subtitle?: string;
  /** Legacy field: merged from subtext/default */
  content?: string;
  /** Rich HTML body text */
  body?: string;
  menuNote?: string;
  bookingUrl?: string;
  /** Services grouped by service_type from database */
  serviceGroups: ServiceGroup[];
}

export interface ServiceHighlight {
  /** Tabler icon name (e.g. "IconHeartHandshake") */
  icon: string;
  title?: string;
  body?: string;
}

export interface ServiceHighlightsProps {
  /** 1-4 highlight items */
  highlights: ServiceHighlight[];
}

export interface TeamMember {
  id: number | string;
  firstName: string;
  lastName: string;
  title?: string;
  bio?: string;
  photoUrl?: string;
  email?: string;
  specialties?: string[];
}

export interface TeamProps {
  title: string;
  /** Rich HTML introduction text */
  richText?: string;
  /** Staff members populated from database */
  members: TeamMember[];
}

export interface Testimonial {
  name: string;
  /** Rich HTML content */
  content: string;
  pictureUrl?: string;
  source?: string;
}

export interface TestimonialsProps {
  title: string;
  subtitle?: string;
  /** Rich HTML intro text */
  richText?: string;
  /** Max 5 testimonials */
  testimonials: Testimonial[];
}

export interface GalleryItem {
  imageUrl: string;
  title?: string;
  description?: string;
}

export interface GalleryProps {
  title: string;
  /** Layout variant: "middle_expand", "uniform", etc. */
  gridLayout?: string;
  /** Max 12 gallery items */
  items: GalleryItem[];
}

export interface SocialLinks {
  instagram?: string;
  facebook?: string;
  twitter?: string;
  tiktok?: string;
}

export interface FindUsProps {
  title: string;
  subtitle?: string;
  showGoogleMaps: boolean;
  address?: string;
  phone?: string;
  email?: string;
  latitude?: number;
  longitude?: number;
  mapUrl?: string;
  /** Day-of-week to hours string mapping */
  hours?: Record<string, string>;
  socials?: SocialLinks;
}

export interface FooterProps {
  companyName?: string;
  phone?: string;
  email?: string;
  address?: string;
  bookingUrl?: string;
  socials?: SocialLinks;
}

// =============================================================================
// Primitive Component Props
// =============================================================================

export interface HeadingProps {
  level: 1 | 2 | 3 | 4 | 5 | 6;
  text: string;
}

export interface TextProps {
  text: string;
}

export interface RichTextProps {
  /** Trusted HTML string from a rich text editor */
  html: string;
}

export interface ImageProps {
  src: string;
  alt?: string;
  width?: number | string;
  height?: number | string;
  loading?: "lazy" | "eager";
}

export interface LinkProps {
  href: string;
  target?: "_blank" | "_self";
  rel?: string;
}

export interface IconProps {
  /** Tabler icon name */
  name: string;
  size?: number;
  color?: string;
}
