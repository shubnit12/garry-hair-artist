/**
 * Private document IDs.
 *
 * The Sanity dataset is public (the Free plan has no private datasets), so
 * anyone who knows the project ID can query it without logging in. The one
 * exception: documents whose `_id` contains a dot are only returned to
 * logged-in Studio users and requests carrying a token
 * (https://www.sanity.io/docs/content-lake/ids). Every document holding
 * personal data is therefore saved under a dotted "private path", e.g.
 * `booking.3f2c…`. The booking engine's day locks (`bookingDayLock.<hash>`,
 * see `dayLockId`) follow the same rule.
 *
 * Shared by the website (server) and the Studio (browser), so it imports
 * nothing and uses the Web Crypto `randomUUID`, available in both.
 */

export const PRIVATE_ID_PREFIXES = {
  booking: "booking.",
  contactMessage: "contactMessage.",
} as const;

export type PrivateDocumentType = keyof typeof PRIVATE_ID_PREFIXES;

export const PRIVATE_DOCUMENT_TYPES = new Set<string>(Object.keys(PRIVATE_ID_PREFIXES));

/** A new, unguessable ID under the type's private path. */
export function newPrivateId(type: PrivateDocumentType): string {
  return `${PRIVATE_ID_PREFIXES[type]}${globalThis.crypto.randomUUID()}`;
}

/** The published form of a Studio ID (`drafts.x` → `x`, `versions.<release>.x` → `x`). */
function publishedId(id: string): string {
  if (id.startsWith("drafts.")) return id.slice("drafts.".length);
  if (id.startsWith("versions.")) return id.split(".").slice(2).join(".");
  return id;
}

/** True when the document (or its draft) sits under the type's private path. */
export function isPrivateDocumentId(type: PrivateDocumentType, id: string | undefined): boolean {
  if (!id) return false;
  const published = publishedId(id);
  const prefix = PRIVATE_ID_PREFIXES[type];
  return published.startsWith(prefix) && published.length > prefix.length;
}

/*
 * Booking links. Clients see the bare UUID (`/booking/3f2c…`); the private
 * prefix is implied. Signed tokens always cover the full document ID.
 */

const BOOKING_PREFIX = PRIVATE_ID_PREFIXES.booking;
const BOOKING_ID_PATTERN = /^booking\.[A-Za-z0-9][A-Za-z0-9_-]{0,119}$/;

/** A published booking document ID, as created by the website or the Studio. */
export function isBookingId(id: string): boolean {
  return BOOKING_ID_PATTERN.test(id);
}

/** URL form of a booking ID. */
export function bookingSlug(id: string): string {
  return id.startsWith(BOOKING_PREFIX) ? id.slice(BOOKING_PREFIX.length) : id;
}

/** Document ID from a URL segment; full IDs pass through unchanged. */
export function bookingIdFromSlug(slug: string): string {
  return slug.includes(".") ? slug : `${BOOKING_PREFIX}${slug}`;
}
