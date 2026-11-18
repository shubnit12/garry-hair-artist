import { SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { parseBody, type ParsedBody } from "next-sanity/webhook";
import type { NextRequest } from "next/server";

import { apiError, handleRouteError, json } from "@/lib/booking/http";
import { processBookingStatusChange } from "@/lib/booking/status-webhook";
import { sanityWebhookSecret } from "@/lib/env.server";

/**
 * POST /api/webhooks/booking-status — Sanity GROQ webhook.
 *
 * Configure in sanity.io/manage → API → Webhooks:
 *   Trigger on: Update · Filter: _type == "booking" && delta::changedAny(status)
 *   Projection: {_id} · HTTP method: POST · Secret: SANITY_WEBHOOK_SECRET
 *
 * Verified deliveries always get a 200 summary (so no-ops are not retried),
 * except when an email fails — then a 5xx lets Sanity retry later.
 */
export async function POST(request: NextRequest) {
  if (!sanityWebhookSecret) {
    console.error("[booking] SANITY_WEBHOOK_SECRET is not set — booking status webhook rejected.");
    return apiError(500, "SERVER", "Webhook is not configured");
  }
  if (!request.headers.get(SIGNATURE_HEADER_NAME)) {
    return apiError(401, "FORBIDDEN", "Missing webhook signature");
  }

  let parsed: ParsedBody<{ _id?: unknown }>;
  try {
    parsed = await parseBody<{ _id?: unknown }>(request, sanityWebhookSecret);
  } catch {
    return apiError(400, "VALIDATION", "Invalid webhook payload");
  }
  if (parsed.isValidSignature !== true) return apiError(401, "FORBIDDEN", "Invalid webhook signature");

  const id = parsed.body?._id;
  if (typeof id !== "string" || !id) return apiError(400, "VALIDATION", "Missing document id");

  try {
    const result = await processBookingStatusChange(id, new Date());
    return json({ ok: true, id, ...result });
  } catch (error) {
    return handleRouteError(error, "POST /api/webhooks/booking-status");
  }
}
