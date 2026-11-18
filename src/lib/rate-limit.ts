import "server-only";

/**
 * Best-effort, in-memory sliding-window rate limiter for form endpoints.
 *
 * On serverless platforms each instance keeps its own window, so this is a
 * speed bump against bursts and naive bots rather than a hard guarantee —
 * combined with the honeypot + minimum fill-time checks it stops the vast
 * majority of form spam without extra infrastructure.
 */

type Window = { hits: number[] };

const buckets = new Map<string, Window>();
const MAX_KEYS = 5_000;

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

export function rateLimit(
  key: string,
  { limit, windowMs }: { limit: number; windowMs: number },
): RateLimitResult {
  const now = Date.now();
  const bucket = buckets.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((time) => now - time < windowMs);

  if (bucket.hits.length >= limit) {
    const retryAfterMs = windowMs - (now - bucket.hits[0]);
    buckets.set(key, bucket);
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil(retryAfterMs / 1000)) };
  }

  bucket.hits.push(now);
  buckets.delete(key); // re-insert to keep Map in LRU-ish order
  buckets.set(key, bucket);

  if (buckets.size > MAX_KEYS) {
    const oldest = buckets.keys().next().value;
    if (oldest !== undefined) buckets.delete(oldest);
  }
  return { ok: true };
}

/** Client IP from Vercel / proxy headers. */
export function getClientIp(headers: Headers): string {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]!.trim();
  return headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * True when a form was submitted implausibly fast after it rendered (bots).
 * `startedAt` comes from the visitor's clock, so a value in the future (clock
 * ahead of the server) or missing is treated as unknown rather than spam.
 */
export function isSuspiciouslyFast(startedAt: number | undefined, minMs = 2500): boolean {
  if (!startedAt) return false;
  const elapsed = Date.now() - startedAt;
  return elapsed >= 0 && elapsed < minMs;
}
