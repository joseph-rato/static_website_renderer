import type { SRNode, GalleryProps } from "@pagoda/schema";
import type { PreviewInputGallery } from "../legacy-types/preview-input.js";

export function buildGallery(gallery: PreviewInputGallery): SRNode {
  const props: GalleryProps = {
    title: gallery.title,
    gridLayout: gallery.grid_layout,
    items: gallery.items.map((item) => ({
      imageUrl: item.image_url,
      title: item.title,
      description: item.description ?? undefined,
    })),
  };
  return {
    type: "gallery",
    id: "gallery",
    props: props as unknown as Record<string, unknown>,
  };
}
