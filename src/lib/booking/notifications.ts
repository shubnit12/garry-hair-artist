import "server-only";

import { getBookingSettings, getSiteSettings } from "@/lib/content/get";
import {
  clientCancelled,
  clientConfirmation,
  clientConfirmedAfterPending,
  ownerCancelled,
  ownerNewBooking,
  type BookingEmailContext,
  type BookingEmailData,
} from "@/lib/email/booking";
import { getOwnerRecipients } from "@/lib/email/recipients";
import { sendEmail, type SendResult } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";

import { describeError } from "./errors";
import { absoluteUrl, bookingIcsAttachment, bookingLinks, businessLocation } from "./public";
import type { BookingRecord } from "./store/types";

/**
 * Sends booking emails and reports per-recipient results, so callers decide
 * what a failure means (a booking stays valid if its email bounces). Sending
 * failures are returned, not thrown. Logs only booking ids.
 */

function toEmailData(record: BookingRecord): BookingEmailData {
  return {
    id: record.id,
    reference: record.reference,
    status: record.status,
    serviceName: record.serviceName,
    serviceSlug: record.serviceSlug,
    durationMinutes: record.durationMinutes,
    date: record.date,
    time: record.time,
    customerName: record.customerName,
    customerEmail: record.customerEmail,
    customerPhone: record.customerPhone,
    notes: record.notes,
  };
}

async function buildContext(
  record: BookingRecord,
  { withLinks, cancellationPolicy }: { withLinks: boolean; cancellationPolicy?: string },
) {
  const [site, policy] = await Promise.all([
    getSiteSettings(),
    cancellationPolicy ? Promise.resolve(cancellationPolicy) : getBookingSettings().then((s) => s.cancellationPolicy),
  ]);
  const links = withLinks ? bookingLinks(record.id) : null;
  const context: BookingEmailContext = {
    siteUrl,
    businessName: site.businessName,
    businessEmail: site.email,
    businessPhone: site.phone,
    location: businessLocation(site),
    cancellationPolicy: policy,
    manageUrl: links ? absoluteUrl(links.manageUrl) : undefined,
    calendarUrl: links ? absoluteUrl(links.calendarUrl) : undefined,
  };
  return { site, context };
}

async function settle(label: string, record: BookingRecord, task: () => Promise<SendResult>): Promise<SendResult> {
  try {
    const result = await task();
    // The provider's error text can echo addresses, so only the booking id is logged here.
    if (!result.ok) console.error(`[booking] ${label} email failed for booking ${record.id}`);
    return result;
  } catch (error) {
    console.error(`[booking] ${label} email failed for booking ${record.id}:`, describeError(error));
    return { ok: false, error: "Unexpected email error" };
  }
}

/** New website booking → owner notification + client confirmation (both with an .ics). */
export async function notifyBookingCreated(
  record: BookingRecord,
  { cancellationPolicy, now }: { cancellationPolicy: string; now: Date },
): Promise<{ owner: SendResult; client: SendResult }> {
  const { site, context } = await buildContext(record, { withLinks: true, cancellationPolicy });
  const data = toEmailData(record);

  const [owner, client] = await Promise.all([
    settle("owner new-booking", record, async () => {
      const email = ownerNewBooking(data, { ...context, manageUrl: undefined, calendarUrl: undefined });
      return sendEmail({
        to: await getOwnerRecipients(),
        ...email,
        replyTo: record.customerEmail || undefined,
        attachments: [bookingIcsAttachment(record, site, now, "owner")],
        idempotencyKey: `booking-${record.id}-owner-new`,
      });
    }),
    settle("client confirmation", record, () =>
      sendEmail({
        to: record.customerEmail,
        ...clientConfirmation(data, context),
        replyTo: site.email,
        attachments: [bookingIcsAttachment(record, site, now)],
        idempotencyKey: `booking-${record.id}-client-confirm`,
      }),
    ),
  ]);
  return { owner, client };
}

/** Client cancelled via their manage link → client receipt + owner notice. */
export async function notifyClientSelfCancelled(
  record: BookingRecord,
): Promise<{ owner: SendResult; client: SendResult }> {
  const { site, context } = await buildContext(record, { withLinks: false });
  const data = toEmailData(record);

  const [owner, client] = await Promise.all([
    settle("owner cancellation", record, async () =>
      sendEmail({
        to: await getOwnerRecipients(),
        ...ownerCancelled(data, context),
        replyTo: record.customerEmail || undefined,
        idempotencyKey: `booking-${record.id}-owner-cancelled`,
      }),
    ),
    settle("client cancellation", record, () =>
      sendEmail({
        to: record.customerEmail,
        ...clientCancelled(data, context, "client"),
        replyTo: site.email,
        idempotencyKey: `booking-${record.id}-client-cancelled`,
      }),
    ),
  ]);
  return { owner, client };
}

/** Garry cancelled in the Studio → tell the client. */
export async function notifyOwnerCancelled(record: BookingRecord): Promise<SendResult> {
  const { site, context } = await buildContext(record, { withLinks: false });
  return settle("client owner-cancellation", record, () =>
    sendEmail({
      to: record.customerEmail,
      ...clientCancelled(toEmailData(record), context, "owner"),
      replyTo: site.email,
      idempotencyKey: `booking-${record.id}-client-cancelled`,
    }),
  );
}

/**
 * A fixed calendar timestamp for a booking. The status webhook may be retried,
 * and a retry must send the same payload under the same idempotency key, so
 * the .ics cannot be stamped with the delivery time.
 */
function stableStamp(record: BookingRecord): Date {
  const created = record.createdAt ? Date.parse(record.createdAt) : Number.NaN;
  return new Date(Number.isFinite(created) ? created : Date.parse(record.start));
}

/** Garry confirmed a pending request in the Studio → tell the client. */
export async function notifyClientConfirmed(record: BookingRecord): Promise<SendResult> {
  const { site, context } = await buildContext(record, { withLinks: true });
  return settle("client confirmed", record, () =>
    sendEmail({
      to: record.customerEmail,
      ...clientConfirmedAfterPending(toEmailData(record), context),
      replyTo: site.email,
      attachments: [bookingIcsAttachment(record, site, stableStamp(record))],
      idempotencyKey: `booking-${record.id}-client-confirmed`,
    }),
  );
}
