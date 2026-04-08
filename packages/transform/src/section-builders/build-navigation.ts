import type { SRNode, NavigationProps, NavLink, BannerProps } from "@pagoda/schema";
import type { DatabaseLogoData } from "../legacy-types/database-data.js";
import type { PreviewInputBanner, PreviewInputBookingLink } from "../legacy-types/preview-input.js";

export function buildNavigation(
  logoData: DatabaseLogoData,
  bookingLink: PreviewInputBookingLink,
  navLinks: NavLink[],
  banner?: PreviewInputBanner,
): SRNode {
  const props: NavigationProps = {
    logoUrl: logoData.image_url,
    logoAlt: logoData.logo_alt_text,
    bookingUrl: bookingLink.url,
    bookButtonText: bookingLink.title,
    navLinks,
  };

  const children: SRNode[] = [];

  if (banner) {
    const bannerProps: BannerProps = {
      title: banner.title ?? undefined,
      content: banner.content,
      textColor: banner.text_color,
      backgroundColor: banner.background_color,
    };
    children.push({
      type: "banner",
      id: "banner",
      props: bannerProps as unknown as Record<string, unknown>,
    });
  }

  return {
    type: "navigation",
    id: "navigation",
    props: props as unknown as Record<string, unknown>,
    ...(children.length > 0 ? { children } : {}),
  };
}
