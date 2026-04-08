import type { SRNode, TestimonialsProps } from "@pagoda/schema";
import type { PreviewInputTestimonials } from "../legacy-types/preview-input.js";

export function buildTestimonials(
  testimonials: PreviewInputTestimonials,
): SRNode {
  const props: TestimonialsProps = {
    title: testimonials.title,
    subtitle: testimonials.subtitle,
    richText: testimonials.text ?? undefined,
    testimonials: testimonials.testimonials.map((t) => ({
      name: t.name,
      content: t.content,
      pictureUrl: t.picture ?? undefined,
      source: t.source,
    })),
  };
  return {
    type: "testimonials",
    id: "testimonials",
    props: props as unknown as Record<string, unknown>,
  };
}
