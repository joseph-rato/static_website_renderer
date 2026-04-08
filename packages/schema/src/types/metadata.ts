export interface OpenGraphMetadata {
  title?: string;
  description?: string;
  image?: string;
  /** Default: "website" */
  type?: string;
}

export interface TwitterMetadata {
  /** Default: "summary_large_image" */
  card?: string;
  title?: string;
  description?: string;
  image?: string;
}

/**
 * Page-level metadata for SEO, analytics, and font loading.
 */
export interface PageMetadata {
  /** Page <title> tag content */
  title: string;

  /** <meta name="description"> */
  description?: string;

  /** Canonical URL of the page */
  url?: string;

  /** OpenGraph metadata for social sharing */
  og?: OpenGraphMetadata;

  /** Twitter Card metadata */
  twitter?: TwitterMetadata;

  /** Favicon URL (also used as apple-touch-icon) */
  favicon?: string;

  /** Google Font family names to load via <link> tags */
  fonts?: string[];

  /** Google Analytics measurement ID (e.g. "G-XXXXXXXXXX" or "UA-XXXXXXXXX-X") */
  analyticsId?: string;
}

/**
 * Design tokens applied as CSS custom properties across the page.
 */
export interface ThemeTokens {
  colors: {
    /** Primary brand color (hex) */
    primary: string;
    /** Secondary brand color (hex) */
    secondary: string;
    /** Text color for primary backgrounds (auto-derived or explicit) */
    primaryText?: string;
    /** Text color for secondary backgrounds (auto-derived or explicit) */
    secondaryText?: string;
    /** Page background color */
    background?: string;
    /** Surface/card background color */
    surface?: string;
  };

  fonts: {
    /** Primary font family (headings, hero) */
    primary: string;
    /** Secondary font family (body text, UI) */
    secondary: string;
  };

  /**
   * Extensible token map for future design tokens.
   * e.g. { "border-radius": "8px", "spacing-unit": "16px" }
   */
  custom?: Record<string, string>;
}
