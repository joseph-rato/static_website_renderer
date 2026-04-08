import type { PageMetadata, ThemeTokens } from "@pagoda/schema";
import type { PreviewInput } from "../legacy-types/preview-input.js";
import type { DatabaseData } from "../legacy-types/database-data.js";

export interface MetadataResult {
  metadata: PageMetadata;
  theme: ThemeTokens;
}

export function buildMetadata(
  previewInput: PreviewInput,
  databaseData: DatabaseData,
): MetadataResult {
  const hero = previewInput.hero_section;
  const logo = databaseData.logo_data;
  const font = previewInput.font;
  const color = previewInput.color;

  const title = hero.header || databaseData.company_name;

  const metadata: PageMetadata = {
    title,
    description: hero.subhead,
    favicon: logo.image_url,
    fonts: [font.primary_font, font.secondary_font],
    analyticsId: databaseData.google_analytics_tracking_id,
    og: {
      title: hero.header,
      description: hero.subhead,
      image: logo.image_url,
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: hero.header,
      description: hero.subhead,
      image: logo.image_url,
    },
    url: databaseData.website_url,
  };

  const theme: ThemeTokens = {
    colors: {
      primary: color.primary_color,
      secondary: color.secondary_color,
    },
    fonts: {
      primary: font.primary_font,
      secondary: font.secondary_font,
    },
  };

  return { metadata, theme };
}
