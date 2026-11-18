import { SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { revalidateTag } from "next/cache";
import { type NextRequest, NextResponse } from "next/server";
import { type ParsedBody, parseBody } from "next-sanity/webhook";

import type { ApiError } from "@/lib/booking/types";
import { sanityRevalidateSecret } from "@/lib/env.server";
import { CONTENT_CACHE_TAG } from "@/lib/site";

/**
 * POST /api/revalidate — Sanity GROQ webhook ("Revalidate website").
 *
 * Called when content is published, updated or deleted, with the projection
 * `{_type}`. Verifies the signature, then expires the cached content so the
 * change is visible on the very next request.
 */

/** Booking data is always read uncached, so these never affect cached pages. */
const IGNORED_TYPES = new Set(["booking", "timeOff", "contactMessage", "bookingDayLock"]);

type WebhookBody = { _type?: unknown };

export type RevalidateResponse =
  | { revalidated: true; type: string | null; tags: string[] }
  | { revalidated: false; skipped: true; type: string };

const NO_STORE = { "Cache-Control": "no-store" };

function error(status: number, body: ApiError) {
  return NextResponse.json(body, { status, headers: NO_STORE });
}

export async function POST(request: NextRequest) {
  if (!sanityRevalidateSecret) {
    console.error("[revalidate] SANITY_REVALIDATE_SECRET is not set");
    return error(500, { error: "SERVER", message: "Revalidation is not configured." });
  }

  // Reject unsigned calls before reading the body.
  if (!request.headers.get(SIGNATURE_HEADER_NAME)) {
    return error(401, { error: "FORBIDDEN", message: "Missing webhook signature." });
  }

  let parsed: ParsedBody<WebhookBody>;
  try {
    // Also waits briefly for Sanity's eventual consistency, so the refetch
    // after revalidation sees the newly published content.
    parsed = await parseBody<WebhookBody>(request, sanityRevalidateSecret);
  } catch {
    return error(400, { error: "VALIDATION", message: "Body must be valid JSON." });
  }

  if (parsed.isValidSignature !== true) {
    return error(401, { error: "FORBIDDEN", message: "Invalid webhook signature." });
  }

  const type = typeof parsed.body?._type === "string" && parsed.body._type ? parsed.body._type : null;

  if (type && IGNORED_TYPES.has(type)) {
    const body: RevalidateResponse = { revalidated: false, skipped: true, type };
    return NextResponse.json(body, { headers: NO_STORE });
  }

  // Every content getter carries CONTENT_CACHE_TAG, so this refreshes the
  // whole site (pages share settings, services and images); the type tag is
  // revalidated too for completeness. `{ expire: 0 }` — rather than the
  // stale-while-revalidate "max" profile — makes the very next request wait
  // for fresh content instead of being served the old version once more.
  const tags = type && type !== CONTENT_CACHE_TAG ? [CONTENT_CACHE_TAG, type] : [CONTENT_CACHE_TAG];
  for (const tag of tags) revalidateTag(tag, { expire: 0 });

  const body: RevalidateResponse = { revalidated: true, type, tags };
  return NextResponse.json(body, { headers: NO_STORE });
}
