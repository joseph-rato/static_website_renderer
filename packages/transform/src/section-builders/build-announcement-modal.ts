import type { SRNode, AnnouncementModalProps } from "@pagoda/schema";
import type { PreviewInputAnnouncementModal } from "../legacy-types/preview-input.js";

export function buildAnnouncementModal(
  modal: PreviewInputAnnouncementModal,
): SRNode {
  const props: AnnouncementModalProps = {
    title: modal.title,
    body: modal.body,
    items: modal.items,
    callToAction: modal.call_to_action,
    backgroundColor: modal.background_color,
    textColor: modal.text_color,
  };
  return {
    type: "announcement-modal",
    id: "announcement-modal",
    props: props as unknown as Record<string, unknown>,
  };
}
