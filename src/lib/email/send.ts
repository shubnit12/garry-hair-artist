import "server-only";

import { Resend } from "resend";

import { emailFrom, isProduction, resendApiKey } from "@/lib/env.server";

export type EmailAttachment = {
  filename: string;
  content: string | Buffer;
  contentType?: string;
};

export type OutgoingEmail = {
  to: string | string[];
  subject: string;
  html: string;
  /** Plain-text alternative — always provide one for deliverability. */
  text: string;
  replyTo?: string | string[];
  attachments?: EmailAttachment[];
  /** Prevents duplicate sends if a request is retried. */
  idempotencyKey?: string;
};

export type SendResult = { ok: true; id: string } | { ok: false; error: string };

const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Sends a transactional email through Resend.
 *
 * Never throws: callers decide what a failed email means (a booking is still
 * valid even if its confirmation email bounces). Without RESEND_API_KEY in
 * development, the email is printed to the server console instead.
 *
 * Logs never include subjects, addresses or the provider's error text, which
 * can contain a client's name or email address.
 */
export async function sendEmail(email: OutgoingEmail): Promise<SendResult> {
  const recipients = (Array.isArray(email.to) ? email.to : [email.to]).filter(Boolean);
  if (!recipients.length) return { ok: false, error: "No recipients" };

  if (!resend) {
    if (isProduction) {
      console.error("[email] RESEND_API_KEY is not set — email not sent");
      return { ok: false, error: "Email is not configured" };
    }
    console.info(
      `\n[email:dev] ── would send ─────────────────────────────\n` +
        `to: ${recipients.join(", ")}\nsubject: ${email.subject}\n` +
        `attachments: ${(email.attachments ?? []).map((a) => a.filename).join(", ") || "none"}\n\n` +
        `${email.text}\n──────────────────────────────────────────────\n`,
    );
    return { ok: true, id: "dev-console" };
  }

  try {
    const { data, error } = await resend.emails.send(
      {
        from: emailFrom,
        to: recipients,
        subject: email.subject,
        html: email.html,
        text: email.text,
        replyTo: email.replyTo,
        attachments: email.attachments,
      },
      email.idempotencyKey ? { idempotencyKey: email.idempotencyKey } : undefined,
    );
    // The key was already used for this email with a different payload (e.g.
    // content edited between webhook retries): it was sent the first time.
    if (error?.name === "invalid_idempotent_request" && email.idempotencyKey) {
      console.warn("[email] Idempotency key already used — treating the email as sent");
      return { ok: true, id: "idempotent-replay" };
    }
    if (error || !data) {
      console.error("[email] Resend rejected the email", { name: error?.name, statusCode: error?.statusCode });
      return { ok: false, error: error?.message ?? "Unknown email error" };
    }
    return { ok: true, id: data.id };
  } catch (error) {
    console.error("[email] Failed to send", error instanceof Error ? error.name : "unknown error");
    return { ok: false, error: error instanceof Error ? error.message : "Unknown email error" };
  }
}
