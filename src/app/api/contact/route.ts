import type { NextRequest } from "next/server";

import { assertSameOrigin } from "@/lib/booking/http";
import { contactMessageSchema, fieldErrorsFrom, type ValidContactMessage } from "@/lib/booking/schema";
import type { ApiError, ApiErrorCode } from "@/lib/booking/types";
import { buildContactOwnerEmail } from "@/lib/email/contact";
import { getOwnerRecipients } from "@/lib/email/recipients";
import { sendEmail } from "@/lib/email/send";
import { newPrivateId } from "@/lib/private-ids";
import { getClientIp, isSuspiciouslyFast, rateLimit } from "@/lib/rate-limit";
import { writeClient } from "@/lib/sanity/client";

/**
 * POST /api/contact — website contact form.
 *
 * Flow: same-origin + JSON content-type guards → bounded JSON read → spam
 * checks (honeypot / fill time) → validation → per-IP rate limit → save to
 * Sanity (when configured) → email the owner.
 * Succeeds when the message was saved OR emailed, so nothing is lost if one
 * of the two services is down.
 */

const MAX_BODY_BYTES = 10 * 1024;
const RATE_LIMIT = { limit: 5, windowMs: 10 * 60 * 1000 };
const SANITY_TIMEOUT_MS = 10_000;
const MAX_FORM_AGE_MS = 24 * 60 * 60 * 1000;

const NO_STORE = { "Cache-Control": "no-store" };

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return Response.json(body, { status, headers: { ...NO_STORE, ...headers } });
}

function apiError(
  status: number,
  error: ApiErrorCode,
  message: string,
  extra: { fieldErrors?: ApiError["fieldErrors"]; headers?: Record<string, string> } = {},
) {
  const body: ApiError = { error, message, ...(extra.fieldErrors ? { fieldErrors: extra.fieldErrors } : {}) };
  return json(body, status, extra.headers);
}

/** Never log message contents — only what helps diagnose the failure. */
function describeError(error: unknown) {
  if (error instanceof Error) {
    const statusCode = (error as { statusCode?: unknown }).statusCode;
    return { name: error.name, message: error.message, ...(typeof statusCode === "number" ? { statusCode } : {}) };
  }
  return { message: String(error) };
}

/** Same CSRF guard as the booking routes, as a boolean (it throws a BookingError). */
function isSameOrigin(request: Request): boolean {
  try {
    assertSameOrigin(request);
    return true;
  } catch {
    return false;
  }
}

/**
 * Exact media-type match. A substring check would accept
 * `text/plain; application/json`, which browsers treat as a CORS-safelisted
 * (preflight-free) type, letting other sites post through visitors' browsers.
 */
function isJsonContentType(request: Request): boolean {
  const essence = (request.headers.get("content-type") ?? "").split(";")[0] ?? "";
  return essence.trim().toLowerCase() === "application/json";
}

type BodyResult = { ok: true; value: unknown } | { ok: false; reason: "too-large" | "invalid" };

/** Reads at most `limit` bytes of the request body and parses it as JSON. */
async function readJsonBody(request: Request, limit: number): Promise<BodyResult> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return { ok: false, reason: "too-large" };
  if (!request.body) return { ok: false, reason: "invalid" };

  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      received += value.byteLength;
      if (received > limit) {
        await reader.cancel().catch(() => undefined);
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } catch {
    return { ok: false, reason: "invalid" };
  }

  const bytes = new Uint8Array(received);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }

  try {
    return { ok: true, value: JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes)) };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** True when a bot filled the hidden "website" field. */
function honeypotFilled(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const website = (raw as Record<string, unknown>).website;
  return typeof website === "string" ? website.trim().length > 0 : website != null;
}

/**
 * Fill-time check. A start time in the future (client clock ahead of ours) or
 * older than a day is ignored rather than treated as spam, so a visitor with a
 * skewed clock never has a genuine message silently dropped.
 */
function submittedTooFast(startedAt: number | undefined): boolean {
  if (startedAt === undefined) return false;
  const elapsed = Date.now() - startedAt;
  return elapsed >= 0 && elapsed <= MAX_FORM_AGE_MS && isSuspiciouslyFast(startedAt);
}

async function saveMessage(message: ValidContactMessage, createdAt: Date): Promise<string | null> {
  if (!writeClient) return null;
  try {
    const document = await writeClient.create(
      {
        // Private path: hidden from unauthenticated reads of the public dataset.
        _id: newPrivateId("contactMessage"),
        _type: "contactMessage",
        status: "new",
        name: message.name,
        email: message.email,
        phone: message.phone,
        topic: message.topic,
        message: message.message,
        createdAt: createdAt.toISOString(),
      },
      { timeout: SANITY_TIMEOUT_MS },
    );
    return document._id;
  } catch (error) {
    console.error("[contact] Could not save message to Sanity", describeError(error));
    return null;
  }
}

async function notifyOwner(message: ValidContactMessage, createdAt: Date, savedId: string | null) {
  try {
    const recipients = await getOwnerRecipients();
    const email = buildContactOwnerEmail({ ...message, receivedAt: createdAt, savedToStudio: Boolean(savedId) });
    const result = await sendEmail({
      to: recipients,
      replyTo: message.email,
      subject: email.subject,
      html: email.html,
      text: email.text,
      ...(savedId ? { idempotencyKey: `contact-message/${savedId}` } : {}),
    });
    // Not `result.error`: the provider's error text can echo addresses.
    if (!result.ok) console.error("[contact] Owner notification failed");
    return result.ok;
  } catch (error) {
    console.error("[contact] Owner notification failed", describeError(error));
    return false;
  }
}

export async function POST(request: NextRequest) {
  try {
    if (!isSameOrigin(request)) {
      return apiError(403, "FORBIDDEN", "Something went wrong. Please refresh the page and try again.");
    }
    if (!isJsonContentType(request)) {
      return apiError(415, "VALIDATION", "Please send the form as JSON.");
    }

    const body = await readJsonBody(request, MAX_BODY_BYTES);
    if (!body.ok) {
      return body.reason === "too-large"
        ? apiError(413, "VALIDATION", "That message is too long to send. Please shorten it and try again.")
        : apiError(400, "VALIDATION", "We couldn't read that request. Please refresh the page and try again.");
    }

    // Silent drop: bots get a normal success response and learn nothing.
    if (honeypotFilled(body.value)) return json({ ok: true });

    const parsed = contactMessageSchema.safeParse(body.value);
    if (!parsed.success) {
      return apiError(400, "VALIDATION", "Please check the highlighted fields.", {
        fieldErrors: fieldErrorsFrom(parsed.error),
      });
    }
    const message = parsed.data;

    if (submittedTooFast(message.startedAt)) return json({ ok: true });

    const limited = rateLimit(`contact:${getClientIp(request.headers)}`, RATE_LIMIT);
    if (!limited.ok) {
      return apiError(
        429,
        "RATE_LIMITED",
        "You've sent several messages in a short time. Please wait a few minutes and try again.",
        { headers: { "Retry-After": String(limited.retryAfterSeconds) } },
      );
    }

    const createdAt = new Date();
    const savedId = await saveMessage(message, createdAt);
    const emailed = await notifyOwner(message, createdAt, savedId);

    // The form adds the "email me directly" fallback, so the message stays short.
    if (!savedId && !emailed) {
      return apiError(503, "UNAVAILABLE", "Sorry — your message couldn't be sent right now.");
    }

    return json({ ok: true });
  } catch (error) {
    console.error("[contact] Unexpected error", describeError(error));
    return apiError(500, "SERVER", "Something went wrong on our side. Please try again in a moment.");
  }
}
