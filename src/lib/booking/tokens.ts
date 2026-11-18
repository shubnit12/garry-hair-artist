import "server-only";

import { createHmac, timingSafeEqual } from "node:crypto";

import { bookingTokenSecret } from "@/lib/env.server";

/**
 * Signed "manage my booking" tokens: base64url(HMAC-SHA256(secret, id)).
 * Possession of the token is what authorises viewing, cancelling and
 * downloading a booking, so it is only ever sent to the client's inbox.
 */

/** False in production when BOOKING_TOKEN_SECRET is missing (routes then return 503). */
export function isTokenSecretConfigured(secret: string = bookingTokenSecret): boolean {
  return secret.length > 0;
}

export function signBookingToken(id: string, secret: string = bookingTokenSecret): string {
  if (!secret) throw new Error("BOOKING_TOKEN_SECRET is not configured");
  return createHmac("sha256", secret).update(id, "utf8").digest("base64url");
}

export function verifyBookingToken(
  id: string,
  token: string | null | undefined,
  secret: string = bookingTokenSecret,
): boolean {
  if (!secret || !token || !id) return false;
  const expected = Buffer.from(signBookingToken(id, secret), "utf8");
  const received = Buffer.from(token, "utf8");
  if (received.length !== expected.length) return false;
  return timingSafeEqual(received, expected);
}
