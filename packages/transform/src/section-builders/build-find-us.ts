import type { SRNode, FindUsProps, SocialLinks } from "@pagoda/schema";
import type { PreviewInputFindUs, PreviewInputSocials } from "../legacy-types/preview-input.js";
import type { DatabaseContactDetails, DatabaseLocationData } from "../legacy-types/database-data.js";

export function buildFindUs(
  findUs: PreviewInputFindUs,
  contactDetails: DatabaseContactDetails,
  locationData: DatabaseLocationData,
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

  const props: FindUsProps = {
    title: findUs.title,
    subtitle: findUs.subtitle ?? undefined,
    showGoogleMaps: findUs.google_maps,
    address: contactDetails.address,
    phone: contactDetails.phone,
    email: contactDetails.email,
    latitude: locationData.latitude,
    longitude: locationData.longitude,
    mapUrl: locationData.map_url,
    hours: contactDetails.hours,
    socials: socialLinks,
  };
  return {
    type: "find-us",
    id: "find-us",
    props: props as unknown as Record<string, unknown>,
  };
}
