import "server-only";

/**
 * Server-only secrets. Importing this module from a Client Component fails the
 * build, which keeps tokens and API keys out of browser bundles.
 */

export const sanityWriteToken = process.env.SANITY_API_WRITE_TOKEN ?? "";
/** Read token for private datasets. Falls back to the write token. */
export const sanityReadToken =
  process.env.SANITY_API_READ_TOKEN || process.env.SANITY_API_WRITE_TOKEN || "";

/** Signs the content-publish webhook that calls /api/revalidate. */
export const sanityRevalidateSecret = process.env.SANITY_REVALIDATE_SECRET ?? "";
/** Signs the booking-status webhook that calls /api/webhooks/booking-status. */
export const sanityWebhookSecret = process.env.SANITY_WEBHOOK_SECRET ?? "";

/** Force the local JSON booking store (`local`) — for local production testing only. */
export const bookingStoreOverride = process.env.BOOKING_STORE ?? "";

export const resendApiKey = process.env.RESEND_API_KEY ?? "";
/** Verified sender, e.g. "Garry Hair Artist <bookings@garryhairartist.com>". */
export const emailFrom =
  process.env.EMAIL_FROM || "Garry Hair Artist <onboarding@resend.dev>";
/** Where new-booking and contact notifications are sent (comma separated). */
export const ownerNotificationEmails = (process.env.BOOKING_NOTIFICATION_EMAIL ?? "")
  .split(",")
  .map((value) => value.trim())
  .filter(Boolean);

/** BOOKING_TOKEN_SECRET exactly as configured, with no development fallback. */
export const configuredBookingTokenSecret = process.env.BOOKING_TOKEN_SECRET ?? "";

/**
 * HMAC secret used to sign "manage my booking" links. The built-in fallback
 * only ever applies to the local JSON store: the Sanity store requires the
 * configured secret (see getBookingStore).
 */
export const bookingTokenSecret =
  process.env.BOOKING_TOKEN_SECRET ||
  (process.env.NODE_ENV === "production" ? "" : "dev-only-booking-secret");

export const isProduction = process.env.NODE_ENV === "production";
