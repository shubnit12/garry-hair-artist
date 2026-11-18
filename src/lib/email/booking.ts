import { looksLikeLinkOrMarkup } from "@/lib/booking/schema";
import { formatLongDate, formatShortDate } from "@/lib/booking/time";
import type { BookingStatus } from "@/lib/booking/types";
import { formatDuration, formatTime24 } from "@/lib/format";

import { button, detailsTable, emailLayout, escapeHtml, mutedParagraph, paragraph, type DetailRow } from "./layout";

/**
 * Booking email templates (HTML + plain text). Pure functions: callers pass
 * every value in, so templates are easy to test. All user-supplied values go
 * through the escaping helpers in ./layout.
 */

export type BookingEmailData = {
  id: string;
  reference: string;
  status: BookingStatus;
  serviceName: string;
  serviceSlug: string;
  durationMinutes: number;
  /** Business-timezone date + time. */
  date: string;
  time: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
};

export type BookingEmailContext = {
  /** Canonical origin, e.g. https://garryhairartist.com */
  siteUrl: string;
  businessName: string;
  businessEmail: string;
  businessPhone?: string;
  /** One-line location, e.g. "Surrey, BC, Canada". */
  location: string;
  cancellationPolicy: string;
  /** Absolute signed links (client emails only). */
  manageUrl?: string;
  calendarUrl?: string;
};

export type EmailContent = { subject: string; html: string; text: string };

const TIME_SUFFIX = "(Pacific Time)";

/** Greeting name; anything link-like (e.g. on an older booking) becomes "there". */
const firstName = (name: string) => {
  const first = name.trim().split(/\s+/)[0];
  return first && !looksLikeLinkOrMarkup(first) ? first : "there";
};
const when = (b: BookingEmailData) => `${formatShortDate(b.date)} at ${formatTime24(b.time)}`;
const studioUrl = (ctx: BookingEmailContext, id: string) =>
  `${ctx.siteUrl}/studio/intent/edit/id=${encodeURIComponent(id)};type=booking`;
const bookAgainUrl = (ctx: BookingEmailContext, b: BookingEmailData) =>
  `${ctx.siteUrl}/book${b.serviceSlug ? `?service=${encodeURIComponent(b.serviceSlug)}` : ""}`;

const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  completed: "Completed",
  cancelled: "Cancelled",
  "no-show": "No-show",
};

function appointmentRows(b: BookingEmailData, ctx: BookingEmailContext, extra: DetailRow[] = []): DetailRow[] {
  return [
    { label: "Service", value: b.serviceName },
    { label: "Date", value: formatLongDate(b.date) },
    { label: "Time", value: `${formatTime24(b.time)} ${TIME_SUFFIX}` },
    { label: "Duration", value: formatDuration(b.durationMinutes) },
    { label: "Location", value: ctx.location },
    ...extra,
    { label: "Reference", value: b.reference },
  ];
}

function clientRows(b: BookingEmailData): DetailRow[] {
  return [
    { label: "Client", value: b.customerName },
    { label: "Email", value: b.customerEmail || "—" },
    { label: "Phone", value: b.customerPhone || "—" },
    ...(b.notes ? [{ label: "Notes", value: b.notes }] : []),
  ];
}

function textRows(rows: DetailRow[]): string {
  return rows.map((row) => `${row.label}: ${row.value}`).join("\n");
}

function footerLines(ctx: BookingEmailContext): string[] {
  return [
    ctx.businessName,
    ctx.location,
    [ctx.businessEmail, ctx.businessPhone].filter(Boolean).join(" · "),
  ].filter(Boolean);
}

function textFooter(ctx: BookingEmailContext): string {
  return ["—", ...footerLines(ctx)].join("\n");
}

function link(label: string, href: string): string {
  return `<p style="margin:0 0 16px;font:13px/1.7 'SFMono-Regular',Menlo,Consolas,'Liberation Mono',monospace;"><a href="${escapeHtml(href)}" style="color:#111111;text-decoration:underline;">${escapeHtml(label)}</a></p>`;
}

/** Owner: a new booking (or booking request) came in from the website. */
export function ownerNewBooking(b: BookingEmailData, ctx: BookingEmailContext): EmailContent {
  const pending = b.status === "pending";
  const heading = pending ? "New booking request" : "New booking";
  const intro = pending
    ? `${b.customerName} requested ${b.serviceName} on ${when(b)}. Open it in the Studio and set the status to Confirmed — the client is emailed automatically.`
    : `${b.customerName} booked ${b.serviceName} on ${when(b)}. Online bookings are confirmed automatically.`;
  const rows = [
    ...clientRows(b),
    ...appointmentRows(b, ctx, [{ label: "Status", value: STATUS_LABEL[b.status] }]).filter(
      (row) => row.label !== "Location",
    ),
  ];
  const studio = studioUrl(ctx, b.id);

  return {
    subject: `New booking: ${b.serviceName} — ${when(b)}`,
    html: emailLayout({
      preheader: `${b.customerName} · ${b.serviceName} · ${when(b)}`,
      heading,
      bodyHtml: `${paragraph(intro)}${detailsTable(rows)}${button("Open in Studio", studio)}${mutedParagraph(
        "Reply to this email to contact the client directly.",
      )}`,
    }),
    text: [heading, "", intro, "", textRows(rows), "", `Open in Studio: ${studio}`].join("\n"),
  };
}

/** Client: confirmation ("You're booked") or request received (pending). */
export function clientConfirmation(b: BookingEmailData, ctx: BookingEmailContext): EmailContent {
  const pending = b.status === "pending";
  const heading = pending ? "Booking request received — Garry will confirm shortly" : "You're booked";
  const intro = pending
    ? `Hi ${firstName(b.customerName)}, thanks for your request. Garry will review it and you'll receive another email as soon as your appointment is confirmed.`
    : `Hi ${firstName(b.customerName)}, thanks for booking with ${ctx.businessName}. Your appointment is confirmed — see you in the chair.`;
  const rows = appointmentRows(b, ctx, [{ label: "Status", value: STATUS_LABEL[b.status] }]);

  return {
    subject: pending
      ? `Booking request received: ${b.serviceName} on ${when(b)}`
      : `You're booked: ${b.serviceName} on ${when(b)}`,
    html: emailLayout({
      preheader: `${b.serviceName} · ${when(b)} · Ref ${b.reference}`,
      heading,
      bodyHtml: [
        paragraph(intro),
        detailsTable(rows),
        ctx.manageUrl ? button("Manage or cancel", ctx.manageUrl) : "",
        ctx.calendarUrl ? link("Add to your calendar (.ics)", ctx.calendarUrl) : "",
        mutedParagraph(ctx.cancellationPolicy),
        mutedParagraph("Questions? Just reply to this email."),
      ].join(""),
      footerLines: footerLines(ctx),
    }),
    text: [
      heading,
      "",
      intro,
      "",
      textRows(rows),
      "",
      ctx.manageUrl ? `Manage or cancel: ${ctx.manageUrl}` : null,
      ctx.calendarUrl ? `Add to your calendar: ${ctx.calendarUrl}` : null,
      "",
      ctx.cancellationPolicy,
      "Questions? Just reply to this email.",
      "",
      textFooter(ctx),
    ]
      .filter((line) => line !== null)
      .join("\n"),
  };
}

/** Client: a pending request was confirmed by Garry in the Studio. */
export function clientConfirmedAfterPending(b: BookingEmailData, ctx: BookingEmailContext): EmailContent {
  const heading = "Your appointment is confirmed";
  const intro = `Hi ${firstName(b.customerName)}, good news — Garry has confirmed your appointment. See you in the chair.`;
  const rows = appointmentRows(b, ctx);

  return {
    subject: `Confirmed: ${b.serviceName} on ${when(b)}`,
    html: emailLayout({
      preheader: `${b.serviceName} · ${when(b)} is confirmed`,
      heading,
      bodyHtml: [
        paragraph(intro),
        detailsTable(rows),
        ctx.manageUrl ? button("Manage or cancel", ctx.manageUrl) : "",
        ctx.calendarUrl ? link("Add to your calendar (.ics)", ctx.calendarUrl) : "",
        mutedParagraph(ctx.cancellationPolicy),
      ].join(""),
      footerLines: footerLines(ctx),
    }),
    text: [
      heading,
      "",
      intro,
      "",
      textRows(rows),
      "",
      ctx.manageUrl ? `Manage or cancel: ${ctx.manageUrl}` : null,
      ctx.calendarUrl ? `Add to your calendar: ${ctx.calendarUrl}` : null,
      "",
      ctx.cancellationPolicy,
      "",
      textFooter(ctx),
    ]
      .filter((line) => line !== null)
      .join("\n"),
  };
}

/** Client: the booking was cancelled — by the client (self-service) or by Garry. */
export function clientCancelled(
  b: BookingEmailData,
  ctx: BookingEmailContext,
  by: "client" | "owner",
): EmailContent {
  const heading = by === "client" ? "Your booking has been cancelled" : "Your appointment has been cancelled";
  const intro =
    by === "client"
      ? `Hi ${firstName(b.customerName)}, as requested your appointment for ${b.serviceName} on ${when(b)} has been cancelled. We hope to see you another time.`
      : `Hi ${firstName(b.customerName)}, unfortunately Garry is unable to keep your appointment for ${b.serviceName} on ${when(b)}, so it has been cancelled. Sorry for the inconvenience — please choose another time that suits you, or reply to this email with any questions.`;
  const rows = appointmentRows(b, ctx, [{ label: "Status", value: STATUS_LABEL.cancelled }]);
  const again = bookAgainUrl(ctx, b);

  return {
    subject: `Booking cancelled: ${b.serviceName} on ${when(b)}`,
    html: emailLayout({
      preheader: `${b.serviceName} · ${when(b)} · cancelled`,
      heading,
      bodyHtml: `${paragraph(intro)}${detailsTable(rows)}${button("Book again", again)}`,
      footerLines: footerLines(ctx),
    }),
    text: [heading, "", intro, "", textRows(rows), "", `Book again: ${again}`, "", textFooter(ctx)].join("\n"),
  };
}

/** Owner: a client cancelled through their manage link. */
export function ownerCancelled(b: BookingEmailData, ctx: BookingEmailContext): EmailContent {
  const heading = "Booking cancelled by client";
  const intro = `${b.customerName} cancelled ${b.serviceName} on ${when(b)}. The time is open again for online booking.`;
  const rows = [
    ...clientRows(b),
    ...appointmentRows(b, ctx).filter((row) => row.label !== "Location"),
  ];
  const studio = studioUrl(ctx, b.id);

  return {
    subject: `Cancelled: ${b.serviceName} — ${when(b)}`,
    html: emailLayout({
      preheader: `${b.customerName} cancelled · ${when(b)}`,
      heading,
      bodyHtml: `${paragraph(intro)}${detailsTable(rows)}${button("Open in Studio", studio)}`,
    }),
    text: [heading, "", intro, "", textRows(rows), "", `Open in Studio: ${studio}`].join("\n"),
  };
}
