import "server-only";

import { fallbackServices } from "@/lib/content/fallback";
import { normaliseBookingSettings, normaliseService } from "@/lib/content/normalize";
import type { BookingSettings, Service } from "@/lib/content/types";
import { liveClient } from "@/lib/sanity/client";
import { BOOKING_SETTINGS_QUERY } from "@/lib/sanity/queries";

import { BookingError, MESSAGES, describeError } from "./errors";
import { SERVICE_BY_SLUG_QUERY } from "./store/queries";

/**
 * CMS reads for the booking engine — read fresh on every call (no CDN, no
 * `use cache`) so a change in the Studio applies to the very next
 * availability check. Display components use the cached getters in
 * lib/content/get.ts instead.
 *
 * These fail closed: when Sanity is connected but a read fails, booking is
 * unavailable (503) rather than computed from the built-in defaults, whose
 * durations, hours and bookable services may differ from what Garry
 * published. The defaults apply only while Sanity is not connected at all.
 */

/** What the booking engine needs to know about a service. */
export type BookableService = Pick<Service, "id" | "slug" | "name" | "durationMinutes" | "bookable">;

const unavailable = (what: string, error: unknown) => {
  console.error(`[booking] Could not load ${what}:`, describeError(error));
  return new BookingError(503, "UNAVAILABLE", MESSAGES.unavailable);
};

export async function getLiveBookingSettings(): Promise<BookingSettings> {
  if (!liveClient) return normaliseBookingSettings(null);
  let raw: Record<string, unknown> | null;
  try {
    raw = await liveClient.fetch<Record<string, unknown> | null>(BOOKING_SETTINGS_QUERY, {}, { cache: "no-store" });
  } catch (error) {
    throw unavailable("booking settings", error);
  }
  return normaliseBookingSettings(raw);
}

/** The published service with this slug, or undefined when there is none. */
export async function getLiveService(slug: string): Promise<BookableService | undefined> {
  if (!liveClient) return fallbackServices.find((service) => service.slug === slug);
  let raw: Record<string, unknown> | null;
  try {
    raw = await liveClient.fetch<Record<string, unknown> | null>(SERVICE_BY_SLUG_QUERY, { slug }, { cache: "no-store" });
  } catch (error) {
    throw unavailable("service", error);
  }
  return normaliseService(raw) ?? undefined;
}
