import "server-only";

import { isBookingId } from "@/lib/private-ids";
import { rateLimit } from "@/lib/rate-limit";

import { BookingError, MESSAGES, SlotTakenError, describeError } from "./errors";
import { getBookingStore, type BookingStore } from "./store";
import { isTokenSecretConfigured } from "./tokens";
import type { ApiError, ApiErrorCode } from "./types";

/** Response + guard helpers shared by the booking route handlers. */

const NO_STORE = { "Cache-Control": "no-store" } as const;

export function json<T>(body: T, init: { status?: number; headers?: Record<string, string> } = {}): Response {
  return Response.json(body, { status: init.status ?? 200, headers: { ...NO_STORE, ...init.headers } });
}

export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  options: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {},
): Response {
  const body: ApiError = { error: code, message };
  if (options.fieldErrors) body.fieldErrors = options.fieldErrors;
  const headers: Record<string, string> = {};
  if (options.retryAfterSeconds) headers["Retry-After"] = String(options.retryAfterSeconds);
  return json(body, { status, headers });
}

/** Maps expected errors to ApiError responses; logs anything unexpected (no PII). */
export function handleRouteError(error: unknown, context: string): Response {
  if (error instanceof BookingError) {
    return apiError(error.status, error.code, error.message, {
      fieldErrors: error.fieldErrors,
      retryAfterSeconds: error.retryAfterSeconds,
    });
  }
  if (error instanceof SlotTakenError) return apiError(409, "SLOT_TAKEN", MESSAGES.slotTaken);
  console.error(`[booking] ${context} failed:`, describeError(error));
  return apiError(500, "SERVER", MESSAGES.generic);
}

export function enforceRateLimit(
  key: string,
  limit: number,
  windowMs: number,
  message: string = MESSAGES.rateLimited,
): void {
  const result = rateLimit(key, { limit, windowMs });
  if (!result.ok) {
    throw new BookingError(429, "RATE_LIMITED", message, {
      retryAfterSeconds: result.retryAfterSeconds,
    });
  }
}

export function requireStore(): BookingStore {
  const store = getBookingStore();
  if (!store) throw new BookingError(503, "UNAVAILABLE", MESSAGES.unavailable);
  return store;
}

/** Signed links are impossible without BOOKING_TOKEN_SECRET (production only). */
export function requireTokenSecret(): void {
  if (isTokenSecretConfigured()) return;
  console.error("[booking] BOOKING_TOKEN_SECRET is not set — booking links cannot be signed.");
  throw new BookingError(503, "UNAVAILABLE", MESSAGES.unavailable);
}

/**
 * Rejects cross-site POSTs (a lightweight CSRF guard that needs nothing from
 * the client): browsers always send `Origin` on cross-origin requests.
 */
export function assertSameOrigin(request: Request): void {
  const origin = request.headers.get("origin");
  if (!origin) return;
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host"))?.split(",")[0]?.trim();
  let originHost: string | null = null;
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = null;
  }
  if (!host || originHost !== host) throw new BookingError(403, "FORBIDDEN", MESSAGES.generic);
}

/** Reads a JSON body, refusing anything larger than `maxBytes` without buffering it all. */
export async function readJsonBody(request: Request, maxBytes: number): Promise<unknown> {
  const tooLarge = () => new BookingError(400, "VALIDATION", "That request is too large.");
  const invalid = () => new BookingError(400, "VALIDATION", "We couldn't read that request. Please try again.");

  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge();
  if (!request.body) throw invalid();

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    let result: ReadableStreamReadResult<Uint8Array>;
    try {
      result = await reader.read();
    } catch {
      throw invalid(); // client aborted mid-upload
    }
    if (result.done) break;
    total += result.value.byteLength;
    if (total > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw tooLarge();
    }
    chunks.push(result.value);
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) as unknown;
  } catch {
    throw invalid();
  }
}

/** Published booking ids under the private `booking.` path; never drafts or other documents. */
export function isValidBookingId(id: string): boolean {
  return isBookingId(id);
}
