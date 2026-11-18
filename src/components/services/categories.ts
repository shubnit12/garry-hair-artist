import { SERVICE_CATEGORIES, type Service, type ServiceCategory } from "@/lib/content/types";

export type ServiceGroup = {
  value: ServiceCategory;
  label: string;
  /** In-page anchor. Prefixed so it can never collide with a service slug (e.g. "consultation"). */
  anchor: string;
  services: Service[];
};

export function categoryAnchor(category: ServiceCategory): string {
  return `category-${category}`;
}

/** Groups services in menu order, skipping categories with no services. */
export function groupServicesByCategory(services: Service[]): ServiceGroup[] {
  return SERVICE_CATEGORIES.map((category) => ({
    value: category.value,
    label: category.label,
    anchor: categoryAnchor(category.value),
    services: services.filter((service) => service.category === category.value),
  })).filter((group) => group.services.length > 0);
}
