import type { SRNode, ServicesMenuProps, ServiceGroup, ServiceItem } from "@pagoda/schema";
import type { PreviewInputOurServices } from "../legacy-types/preview-input.js";
import type { DatabaseService } from "../legacy-types/database-data.js";

export function buildServicesMenu(
  ourServices: PreviewInputOurServices,
  services: DatabaseService[],
  bookingUrl: string,
): SRNode {
  const grouped = new Map<string, ServiceItem[]>();
  for (const svc of services) {
    const items = grouped.get(svc.service_type) ?? [];
    items.push({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      price: svc.default_price,
      isVariablePrice: svc.default_is_variable_price,
      durationMins: svc.default_duration_mins,
    });
    grouped.set(svc.service_type, items);
  }

  const serviceGroups: ServiceGroup[] = [];
  for (const [category, items] of grouped) {
    serviceGroups.push({ category, services: items });
  }

  const props: ServicesMenuProps = {
    title: ourServices.header,
    subtitle: ourServices.subtitle ?? undefined,
    content: ourServices.subtext ?? ourServices.default ?? undefined,
    body: ourServices.body ?? undefined,
    menuNote: ourServices.menu_note ?? undefined,
    bookingUrl,
    serviceGroups,
  };
  return {
    type: "services-menu",
    id: "services",
    props: props as unknown as Record<string, unknown>,
  };
}
