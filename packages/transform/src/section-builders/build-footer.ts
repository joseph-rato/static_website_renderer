import type { SRNode, FooterProps, SocialLinks } from "@pagoda/schema";
import type { DatabaseContactDetails } from "../legacy-types/database-data.js";
import type { PreviewInputSocials } from "../legacy-types/preview-input.js";

export function buildFooter(
  companyName: string,
  contactDetails: DatabaseContactDetails,
  bookingUrl: string,
  socials?: PreviewInputSocials,
): SRNode {
  let socialLinks: SocialLinks | undefined;
  if (socials) {
    socialLinks = {
      instagram: socials.instagram_url ?? undefined,
      facebook: socials.facebook_url ?? undefined,
      twitter: socials.twitter_url ?? undefined,
      tiktok: socials.tiktok_url ?? undefined,
    };
  }

  const props: FooterProps = {
    companyName,
    phone: contactDetails.phone,
    email: contactDetails.email,
    address: contactDetails.address,
    bookingUrl,
    socials: socialLinks,
  };
  return {
    type: "footer",
    id: "footer",
    props: props as unknown as Record<string, unknown>,
  };
}
