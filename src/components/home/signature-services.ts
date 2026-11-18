import type { Service } from "@/lib/content/types";

/** The reference layout shows three signature services side by side. */
export const SIGNATURE_SERVICE_LIMIT = 3;

/**
 * Services highlighted on the home page: the ones marked "featured" in the
 * Studio, or — when none are — the first bookable services in menu order.
 */
export function pickSignatureServices(
  services: Service[],
  limit = SIGNATURE_SERVICE_LIMIT,
): Service[] {
  const featured = services.filter((service) => service.featured);
  const pool = featured.length ? featured : services.filter((service) => service.bookable);
  return pool.slice(0, limit);
}
