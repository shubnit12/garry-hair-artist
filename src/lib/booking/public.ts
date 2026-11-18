import "server-only";

import type { SiteSettings } from "@/lib/content/types";
import type { EmailAttachment } from "@/lib/email/send";
import { siteUrl } from "@/lib/env";
import { formatAddressLines } from "@/lib/format";
import { bookingSlug } from "@/lib/private-ids";

import { buildBookingIcs } from "./ics";
import type { BookingRecord } from "./store/types";
import { signBookingToken } from "./tokens";
import type { PublicBooking } from "./types";

/**
 * Relative signed URLs for a booking (prefix with `siteUrl` for emails). The
 * path carries the bare UUID; the token covers the full document id.
 */
export function bookingLinks(id: string): { manageUrl: string; calendarUrl: string } {
  const token = encodeURIComponent(signBookingToken(id));
  const safeId = encodeURIComponent(bookingSlug(id));
  return {
    manageUrl: `/booking/${safeId}?token=${token}`,
    calendarUrl: `/api/bookings/${safeId}/calendar?token=${token}`,
  };
}

export function absoluteUrl(path: string): string {
  return `${siteUrl}${path}`;
}

/** The subset of a booking that is safe to show the person who made it. */
export function toPublicBooking(record: BookingRecord): PublicBooking {
  return {
    id: record.id,
    reference: record.reference,
    status: record.status,
    serviceSlug: record.serviceSlug,
    serviceName: record.serviceName,
    durationMinutes: record.durationMinutes,
    date: record.date,
    time: record.time,
    start: record.start,
    end: record.end,
    customerName: record.customerName,
    ...bookingLinks(record.id),
  };
}

/** One-line location for calendar files and emails. */
export function businessLocation(site: SiteSettings): string {
  if (!site.address.street) return site.mapQuery;
  return [...formatAddressLines(site.address), site.address.country].join(", ");
}

/** Studio deep link for a booking document. */
export function studioBookingUrl(id: string): string {
  return absoluteUrl(`/studio/intent/edit/id=${encodeURIComponent(id)};type=booking`);
}

/**
 * Calendar file for a booking. The client's copy links to their manage page;
 * the owner's copy is titled with the client's name and carries their contact
 * details plus a Studio link instead.
 */
export function bookingIcs(
  record: BookingRecord,
  site: SiteSettings,
  now: Date,
  audience: "client" | "owner" = "client",
): string {
  const owner = audience === "owner";
  return buildBookingIcs({
    id: record.id,
    reference: record.reference,
    status: record.status,
    serviceName: record.serviceName,
    start: record.start,
    end: record.end,
    location: businessLocation(site),
    manageUrl: owner ? undefined : absoluteUrl(bookingLinks(record.id).manageUrl),
    summary: owner ? `${record.serviceName} — ${record.customerName}` : undefined,
    description: owner
      ? [
          `Booking reference: ${record.reference}`,
          `Client: ${record.customerName}`,
          record.customerPhone ? `Phone: ${record.customerPhone}` : null,
          record.customerEmail ? `Email: ${record.customerEmail}` : null,
          record.notes ? `Notes: ${record.notes}` : null,
          `Open in Studio: ${studioBookingUrl(record.id)}`,
        ]
          .filter(Boolean)
          .join("\n")
      : undefined,
    now,
  });
}

export function icsFilename(reference: string): string {
  return `garry-hair-artist-${reference.replace(/[^A-Za-z0-9-]/g, "")}.ics`;
}

export function bookingIcsAttachment(
  record: BookingRecord,
  site: SiteSettings,
  now: Date,
  audience: "client" | "owner" = "client",
): EmailAttachment {
  return {
    filename: icsFilename(record.reference),
    content: Buffer.from(bookingIcs(record, site, now, audience), "utf8"),
    contentType: "text/calendar; charset=utf-8; method=PUBLISH",
  };
}
