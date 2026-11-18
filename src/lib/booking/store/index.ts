import "server-only";

import { bookingStoreOverride, configuredBookingTokenSecret, isProduction } from "@/lib/env.server";
import { liveClient, writeClient } from "@/lib/sanity/client";

import { createLocalStore } from "./local";
import { createSanityStore } from "./sanity";
import type { BookingStore } from "./types";

export type { BookingClient, BookingPatch, BookingRecord, BookingStore, BookingUpdateResult } from "./types";
export { ACTIVE_STATUSES } from "./types";

let cached: BookingStore | null | undefined;

/**
 * The active booking store:
 *  - local JSON file when BOOKING_STORE=local (explicit override),
 *  - Sanity when both the live and write clients are configured and
 *    BOOKING_TOKEN_SECRET is set (never the built-in development secret: the
 *    dataset may be shared with the live site, and the secret names its locks),
 *  - local JSON file in development,
 *  - otherwise null → booking endpoints respond 503.
 */
export function getBookingStore(): BookingStore | null {
  if (cached !== undefined) return cached;
  if (bookingStoreOverride === "local") {
    cached = createLocalStore();
  } else if (writeClient && liveClient) {
    if (configuredBookingTokenSecret) {
      cached = createSanityStore({ readClient: liveClient, writeClient, lockSecret: configuredBookingTokenSecret });
    } else {
      console.error(
        "[booking] BOOKING_TOKEN_SECRET is not set. It is required whenever bookings are stored in Sanity, also locally — online booking is off until it is.",
      );
      cached = null;
    }
  } else if (!isProduction) {
    cached = createLocalStore();
  } else {
    console.error(
      "[booking] No booking store configured: set SANITY_API_WRITE_TOKEN (and the Sanity project env vars) to enable online booking.",
    );
    cached = null;
  }
  return cached;
}
