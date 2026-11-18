import type { TimeOff } from "@/lib/content/types";

import type { BusyBooking } from "../availability";
import { referenceFromId } from "../reference";
import { DATE_RE, TIME_RE } from "../schema";
import { addMinutes, zonedToUtc } from "../time";
import type { BookingStatus } from "../types";
import type { BookingClient, BookingRecord } from "./types";

/** Turns loosely-typed stored data (Sanity or JSON) into strict records. */

type Raw = Record<string, unknown> | null | undefined;

const STATUSES: readonly BookingStatus[] = ["pending", "confirmed", "completed", "cancelled", "no-show"];

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");
const optText = (value: unknown): string | undefined => text(value) || undefined;

function status(value: unknown, fallback: BookingStatus): BookingStatus {
  return STATUSES.includes(value as BookingStatus) ? (value as BookingStatus) : fallback;
}

export function duration(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0
    ? Math.min(12 * 60, Math.round(value))
    : 60;
}

export function toBookingRecord(raw: Raw): BookingRecord | null {
  const id = text(raw?.id ?? raw?._id);
  const date = text(raw?.date);
  const time = text(raw?.time);
  if (!raw || !id || !DATE_RE.test(date) || !TIME_RE.test(time)) return null;

  const durationMinutes = duration(raw.durationMinutes);
  // date + time + duration are the source of truth (they may be edited in the Studio).
  const start = zonedToUtc(date, time);
  const cancelledBy = raw.cancelledBy === "client" || raw.cancelledBy === "owner" ? raw.cancelledBy : undefined;

  return {
    id,
    reference: optText(raw.reference) ?? referenceFromId(id),
    // Studio bookings default to "confirmed" (the schema's initial value).
    status: status(raw.status, "confirmed"),
    serviceId: optText(raw.serviceId),
    serviceSlug: text(raw.serviceSlug),
    serviceName: optText(raw.serviceName) ?? "Appointment",
    durationMinutes,
    date,
    time,
    start: start.toISOString(),
    end: addMinutes(start, durationMinutes).toISOString(),
    customerName: optText(raw.customerName) ?? "Client",
    customerEmail: text(raw.customerEmail),
    customerPhone: text(raw.customerPhone),
    notes: text(raw.notes),
    source: raw.source === "website" ? "website" : "studio",
    createdAt: optText(raw.createdAt),
    cancelledAt: optText(raw.cancelledAt),
    cancelledBy,
    notifiedStatus: raw.notifiedStatus ? status(raw.notifiedStatus, "pending") : undefined,
  };
}

export function toBusyBooking(raw: Raw): BusyBooking | null {
  const date = text(raw?.date);
  const time = text(raw?.time);
  if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
  return { date, time, durationMinutes: duration(raw?.durationMinutes) };
}

export function toTimeOff(raw: Raw): TimeOff | null {
  const startDate = text(raw?.startDate);
  if (!raw || !DATE_RE.test(startDate)) return null;
  const endDate = DATE_RE.test(text(raw.endDate)) ? text(raw.endDate) : startDate;
  return {
    id: text(raw.id ?? raw._id) || startDate,
    startDate,
    endDate: endDate < startDate ? startDate : endDate,
    allDay: raw.allDay !== false,
    startTime: optText(raw.startTime),
    endTime: optText(raw.endTime),
    reason: optText(raw.reason),
  };
}

/**
 * True when a stored booking was made with the client's email address.
 *
 * Email only, on purpose: matching phone numbers too would let anyone check
 * whether a number they know has upcoming appointments (book with your own
 * email and their number, and see whether the cap answers 429). With email,
 * a probe that doesn't hit the cap creates a booking and emails its owner.
 */
export function isSameClient(raw: Raw, client: BookingClient): boolean {
  const email = client.email.trim().toLowerCase();
  return Boolean(email) && text(raw?.customerEmail).toLowerCase() === email;
}

/** How many of these active bookings start after `now` and belong to the client. */
export function countUpcomingForClient(rows: Raw[], client: BookingClient, now: Date): number {
  return rows.filter((raw) => {
    const busy = toBusyBooking(raw);
    return busy !== null && zonedToUtc(busy.date, busy.time).getTime() > now.getTime() && isSameClient(raw, client);
  }).length;
}
