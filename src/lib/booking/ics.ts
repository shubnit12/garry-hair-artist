import { siteUrl as defaultSiteUrl } from "@/lib/env";

import type { BookingStatus } from "./types";

/**
 * RFC 5545 calendar file for a single appointment (METHOD:PUBLISH, times in
 * UTC). Re-downloading after a status change replaces the same event because
 * the UID is stable and SEQUENCE increases through the booking lifecycle.
 */

export type CalendarEventInput = {
  id: string;
  reference: string;
  status: BookingStatus;
  serviceName: string;
  /** ISO-8601 UTC instants. */
  start: string;
  end: string;
  location: string;
  /** Absolute URL of the signed manage page. */
  manageUrl?: string;
  /** Overrides for the owner's copy (defaults are written for the client). */
  summary?: string;
  description?: string;
  /** DTSTAMP — when this file was generated. */
  now: Date;
  siteUrl?: string;
};

const CRLF = "\r\n";
const MAX_OCTETS = 75;

/** Escapes a TEXT value: backslash, semicolon, comma and newlines. */
export function escapeIcsText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r\n|\r|\n/g, "\\n");
}

/**
 * Folds a content line to at most 75 octets per physical line (continuations
 * start with a single space), never splitting a multi-byte UTF-8 character.
 */
export function foldIcsLine(line: string): string {
  const parts: string[] = [];
  let current = "";
  let currentOctets = 0;
  let limit = MAX_OCTETS;
  for (const char of line) {
    const octets = Buffer.byteLength(char, "utf8");
    if (currentOctets + octets > limit) {
      parts.push(current);
      current = "";
      currentOctets = 0;
      limit = MAX_OCTETS - 1; // the leading space counts towards the 75
    }
    current += char;
    currentOctets += octets;
  }
  parts.push(current);
  return parts.join(`${CRLF} `);
}

/** 2026-11-07T22:30:00.000Z → 20261107T223000Z */
export function formatIcsDate(value: string | Date): string {
  const iso = (typeof value === "string" ? new Date(value) : value).toISOString();
  return `${iso.slice(0, 19).replace(/[-:]/g, "")}Z`;
}

const STATUS: Record<BookingStatus, { status: string; sequence: number }> = {
  pending: { status: "TENTATIVE", sequence: 0 },
  confirmed: { status: "CONFIRMED", sequence: 1 },
  completed: { status: "CONFIRMED", sequence: 1 },
  "no-show": { status: "CONFIRMED", sequence: 1 },
  cancelled: { status: "CANCELLED", sequence: 2 },
};

export function buildBookingIcs(input: CalendarEventInput): string {
  const base = input.siteUrl ?? defaultSiteUrl;
  const host = new URL(base).host;
  const { status, sequence } = STATUS[input.status];
  const summary = input.summary ?? `${input.serviceName} with Garry Hair Artist`;
  const description =
    input.description ??
    [
      `Booking reference: ${input.reference}`,
      input.manageUrl ? `Manage or cancel your booking: ${input.manageUrl}` : null,
    ]
      .filter(Boolean)
      .join("\n");

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Garry Hair Artist//Online Booking//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${input.id}@${host}`,
    `DTSTAMP:${formatIcsDate(input.now)}`,
    `DTSTART:${formatIcsDate(input.start)}`,
    `DTEND:${formatIcsDate(input.end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `LOCATION:${escapeIcsText(input.location)}`,
    `DESCRIPTION:${escapeIcsText(description)}`,
    ...(input.manageUrl ? [`URL:${input.manageUrl}`] : []),
    `STATUS:${status}`,
    `SEQUENCE:${sequence}`,
    "TRANSP:OPAQUE",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.map(foldIcsLine).join(CRLF) + CRLF;
}
