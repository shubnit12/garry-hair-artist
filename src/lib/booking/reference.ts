/** Shared by the website and the Studio (browser), so it uses Web Crypto. */

/** Crockford base32 — no I, L, O or U, so codes are easy to read aloud. */
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const LENGTH = 5;

export const REFERENCE_RE = /^GH-[0-9A-HJKMNP-TV-Z]{5}$/;

/** Human-friendly booking code, e.g. "GH-7K2P9". Not a secret and not unique by itself — ids are. */
export function generateReference(): string {
  // 256 is a multiple of 32, so `byte & 31` is uniformly distributed.
  const bytes = globalThis.crypto.getRandomValues(new Uint8Array(LENGTH));
  let code = "";
  for (const byte of bytes) code += ALPHABET[byte & 31];
  return `GH-${code}`;
}

/**
 * Stable fallback for bookings without a stored reference (Studio bookings now
 * get one when created; this covers any made before that or by scripts).
 * Uses the id's last segment, so the `booking.` (or `drafts.booking.`) prefix
 * doesn't give every Studio booking the same few codes.
 */
export function referenceFromId(id: string): string {
  const clean = id.slice(id.lastIndexOf(".") + 1).replace(/[^0-9a-z]/gi, "").toUpperCase();
  let code = "";
  for (const char of clean) {
    if (ALPHABET.includes(char)) code += char;
    if (code.length === LENGTH) break;
  }
  return `GH-${code.padEnd(LENGTH, "0")}`;
}
