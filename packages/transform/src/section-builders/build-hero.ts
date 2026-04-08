import type { SRNode, HeroProps } from "@pagoda/schema";
import type { PreviewInputHeroSection } from "../legacy-types/preview-input.js";

export function buildHero(
  hero: PreviewInputHeroSection,
  bookingUrl: string,
): SRNode {
  const props: HeroProps = {
    header: hero.header,
    subhead: hero.subhead,
    imageUrl: hero.image,
    richText: hero.text ?? undefined,
    showBookButton: hero.include_book_now_button,
    bookButtonText: hero.book_link_copy,
    bookingUrl,
  };
  return {
    type: "hero",
    id: "home",
    props: props as unknown as Record<string, unknown>,
  };
}
