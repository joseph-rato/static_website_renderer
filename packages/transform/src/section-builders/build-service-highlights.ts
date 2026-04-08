import type { SRNode, ServiceHighlightsProps } from "@pagoda/schema";
import type { PreviewInputServiceHighlights } from "../legacy-types/preview-input.js";

export function buildServiceHighlights(
  serviceHighlights: PreviewInputServiceHighlights,
): SRNode {
  const props: ServiceHighlightsProps = {
    highlights: serviceHighlights.highlights.map((h) => ({
      icon: h.icon,
      title: h.title,
      body: h.body,
    })),
  };
  return {
    type: "service-highlights",
    id: "highlights",
    props: props as unknown as Record<string, unknown>,
  };
}
