import type { CustomValidator, ValidationContext } from "sanity";

import { ACTIVE_BOOKING_STATUSES, DEFAULT_BOOKING_STATUS, isActiveStatus, STUDIO_API_VERSION } from "./constants";
import { findConflicts, type Conflict } from "./conflicts";
import {
  formatMinutes,
  formatMinutesRange,
  formatTime,
  formatTimeRange,
  isDateString,
  isTimeString,
  timeToMinutes,
  weekdayOf,
  weekdayTitle,
} from "./dates";
import {
  resolveBufferMinutes,
  resolveWeeklyHours,
  timeOffCoversDate,
  timeOffWindow,
  type RawOpeningHours,
  type TimeOffEntry,
} from "./hours";

/**
 * Studio-only WARNINGS for bookings (they never block saving): Garry may
 * deliberately squeeze someone in, but he should know when a booking clashes
 * with another appointment, falls on a closed day or overlaps his time off.
 */

type BookingDocument = {
  _id?: string;
  status?: string;
  date?: string;
  time?: string;
  durationMinutes?: number;
  service?: { _ref?: string };
};

type OtherBooking = {
  id: string;
  time: string;
  durationMinutes: number;
  customerName?: string | null;
  serviceName?: string | null;
};

type DayContext = {
  others: OtherBooking[];
  /** Name and duration of the service this booking references (published). */
  serviceName?: string | null;
  serviceDuration: number | null;
  settings: { bufferMinutes?: number | null; weeklyHours?: RawOpeningHours[] | null } | null;
  timeOff: TimeOffEntry[];
};

// The stored serviceName is a snapshot from booking time; once the service
// reference points at a different service (its slug no longer matches), the
// referenced service's name wins.
const DAY_CONTEXT_QUERY = /* groq */ `{
  "others": *[
    _type == "booking" && date == $date && coalesce(status, $defaultStatus) in $active && !(_id in $ids)
  ]{
    "id": _id,
    time,
    customerName,
    "serviceName": select(
      defined(service->slug.current) && service->slug.current != serviceSlug => service->name,
      coalesce(serviceName, service->name)
    ),
    "durationMinutes": coalesce(durationMinutes, service->durationMinutes, 60)
  },
  "serviceName": *[_type == "service" && _id == $serviceId][0].name,
  "serviceDuration": *[_type == "service" && _id == $serviceId][0].durationMinutes,
  "settings": *[_id == "bookingSettings"][0]{ bufferMinutes, weeklyHours[]{ day, closed, open, close } },
  "timeOff": *[_type == "timeOff" && startDate <= $date && coalesce(endDate, startDate) >= $date]{
    _id, reason, startDate, endDate, allDay, startTime, endTime
  }
}`;

/** The date, time and duration validators run together; share one request between them. */
const CACHE_TTL_MS = 2_000;
const cache = new Map<string, { at: number; promise: Promise<DayContext | null> }>();

function publishedId(id: string | undefined): string {
  return (id ?? "").replace(/^drafts\./, "").replace(/^versions\.[^.]+\./, "");
}

function loadDayContext(
  context: ValidationContext,
  booking: BookingDocument,
  date: string,
): Promise<DayContext | null> {
  const id = publishedId(booking._id);
  const serviceId = booking.service?._ref ?? "";
  const key = `${date}|${id}|${serviceId}`;
  const now = Date.now();

  const cached = cache.get(key);
  if (cached && now - cached.at < CACHE_TTL_MS) return cached.promise;

  const promise = context
    .getClient({ apiVersion: STUDIO_API_VERSION })
    .fetch<DayContext>(
      DAY_CONTEXT_QUERY,
      {
        date,
        ids: [id, `drafts.${id}`],
        serviceId,
        active: [...ACTIVE_BOOKING_STATUSES],
        defaultStatus: DEFAULT_BOOKING_STATUS,
      },
      { perspective: "published", tag: "studio.booking-validation" },
    )
    // A failed lookup (e.g. offline) must never get in the way of editing.
    .catch(() => null);

  for (const [entryKey, entry] of cache) {
    if (now - entry.at >= CACHE_TTL_MS) cache.delete(entryKey);
  }
  cache.set(key, { at: now, promise });
  return promise;
}

function describe(other: OtherBooking): string {
  const who = other.customerName?.trim() || "another client";
  const what = [other.serviceName?.trim(), formatTimeRange(other.time, other.durationMinutes)]
    .filter(Boolean)
    .join(", ");
  return `${who} (${what})`;
}

function describeAll(conflicts: Conflict<OtherBooking>[]): string {
  const names = conflicts.slice(0, 3).map(({ other }) => describe(other));
  const extra = conflicts.length - names.length;
  return extra > 0 ? `${names.join("; ")} and ${extra} more` : names.join("; ");
}

function result(messages: string[]): true | string {
  return messages.length ? messages.join(" ") : true;
}

/** Warns when the booking falls on a closed weekday or an all-day time off. */
export const bookingDateWarning: CustomValidator<string | undefined> = async (date, context) => {
  const booking = context.document as BookingDocument | undefined;
  if (!booking || !isDateString(date) || !isActiveStatus(booking.status)) return true;

  const day = await loadDayContext(context, booking, date);
  if (!day) return true;

  const messages: string[] = [];
  const hours = resolveWeeklyHours(day.settings?.weeklyHours)[weekdayOf(date)];
  if (hours.closed) {
    messages.push(
      `${weekdayTitle(hours.day)}s are closed in Booking settings, so the website doesn't offer this day.`,
    );
  }

  const allDayOff = day.timeOff.find((entry) => timeOffCoversDate(entry, date) && !timeOffWindow(entry));
  if (allDayOff) {
    messages.push(`This date is blocked as time off${allDayOff.reason ? ` (${allDayOff.reason})` : ""}.`);
  }

  return result(messages);
};

/**
 * Warns when the appointment overlaps (or sits inside the buffer of) another
 * active booking, runs outside opening hours, or overlaps partial time off.
 */
export const bookingTimeWarning: CustomValidator<string | undefined> = async (time, context) => {
  const booking = context.document as BookingDocument | undefined;
  const date = booking?.date;
  if (!booking || !isTimeString(time) || !isDateString(date) || !isActiveStatus(booking.status)) {
    return true;
  }

  const day = await loadDayContext(context, booking, date);
  if (!day) return true;

  const duration = booking.durationMinutes ?? day.serviceDuration ?? 60;
  const buffer = resolveBufferMinutes(day.settings?.bufferMinutes);
  const start = timeToMinutes(time);
  const end = start + duration;
  const messages: string[] = [];

  const conflicts = findConflicts({ time, durationMinutes: duration }, day.others, buffer);
  const overlaps = conflicts.filter((conflict) => conflict.kind === "overlap");
  const tooClose = conflicts.filter((conflict) => conflict.kind === "buffer");
  if (overlaps.length) messages.push(`Overlaps with ${describeAll(overlaps)}.`);
  if (tooClose.length) {
    messages.push(`Leaves less than your ${buffer}-minute buffer next to ${describeAll(tooClose)}.`);
  }

  const hours = resolveWeeklyHours(day.settings?.weeklyHours)[weekdayOf(date)];
  if (!hours.closed) {
    if (start < timeToMinutes(hours.open)) {
      messages.push(`Starts before opening time (${formatTime(hours.open)}).`);
    } else if (end > timeToMinutes(hours.close)) {
      messages.push(`Ends at ${formatMinutes(end)}, after closing time (${formatTime(hours.close)}).`);
    }
  }

  for (const entry of day.timeOff) {
    const window = timeOffCoversDate(entry, date) ? timeOffWindow(entry) : null;
    if (window && start < window.end && end > window.start) {
      const label = entry.reason ? ` (${entry.reason})` : "";
      messages.push(`Overlaps your time off${label}, ${formatMinutesRange(window.start, window.end)}.`);
      break;
    }
  }

  return result(messages);
};

/**
 * Warns when an active booking has no length of its own, or when its length
 * differs from the selected service's (e.g. after switching a website booking
 * to another service). A booking without a duration borrows the service's,
 * and shrinks to 60 minutes if that service is ever deleted or unpublished.
 */
export const bookingDurationWarning: CustomValidator<number | undefined> = async (duration, context) => {
  const booking = context.document as BookingDocument | undefined;
  if (!booking?.service?._ref || !isActiveStatus(booking.status)) return true;

  if (typeof duration !== "number") {
    return (
      "Enter how long this appointment takes. If it's left empty and the service is later deleted, " +
      "the booking only blocks 60 minutes."
    );
  }

  if (!isDateString(booking.date)) return true;
  const day = await loadDayContext(context, booking, booking.date);
  if (!day || typeof day.serviceDuration !== "number" || day.serviceDuration === duration) return true;

  const service = day.serviceName?.trim() || "The selected service";
  return (
    `${service} takes ${day.serviceDuration} min, but this booking is ${duration} min. ` +
    "If the service changed, update the duration to match."
  );
};
