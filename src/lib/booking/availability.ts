import type { BookingSettings, TimeOff } from "@/lib/content/types";

import {
  addDays,
  addMinutes,
  businessToday,
  datesInMonth,
  minutesToTime,
  timeToMinutes,
  weekdayOf,
  zonedToUtc,
} from "./time";
import type { CalendarDayStatus, SlotStatus, TimeSlot } from "./types";

/**
 * The availability engine. PURE: everything it needs (settings, existing
 * bookings, time off and "now") is passed in, so the same code produces the
 * slots shown to clients and re-validates a slot inside the booking lock.
 *
 * All comparisons use absolute instants, so days with a clock change are
 * handled correctly; slot labels are always wall-clock times.
 */

/** An existing appointment that blocks time (status pending or confirmed). */
export type BusyBooking = {
  date: string;
  time: string;
  durationMinutes: number;
};

export type AvailabilityInput = {
  settings: Pick<
    BookingSettings,
    "slotIntervalMinutes" | "bufferMinutes" | "minNoticeMinutes" | "maxAdvanceDays" | "weeklyHours"
  >;
  /** Duration of the service being booked. */
  durationMinutes: number;
  /** Active bookings on (or overlapping) the dates being evaluated. */
  bookings: BusyBooking[];
  timeOff: TimeOff[];
  now: Date;
};

export type DayAvailability = { closed: boolean; slots: TimeSlot[] };

type Interval = { start: number; end: number };

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** First and last dates clients may book at all (inclusive). */
export function bookingWindow(
  settings: Pick<BookingSettings, "minNoticeMinutes" | "maxAdvanceDays">,
  now: Date,
): { firstBookableDate: string; lastBookableDate: string } {
  const today = businessToday(now);
  const earliest = businessToday(addMinutes(now, settings.minNoticeMinutes));
  return {
    firstBookableDate: earliest > today ? earliest : today,
    lastBookableDate: addDays(today, settings.maxAdvanceDays),
  };
}

function toInterval(booking: BusyBooking): Interval | null {
  if (!TIME_RE.test(booking.time) || !(booking.durationMinutes > 0)) return null;
  const start = zonedToUtc(booking.date, booking.time).getTime();
  return { start, end: start + booking.durationMinutes * 60_000 };
}

/**
 * Time off that applies to `date`: `"all-day"` when the whole day is blocked,
 * otherwise the blocked intervals. A partial entry with missing / inverted
 * times is treated as all-day — when in doubt, never offer the time.
 */
function timeOffFor(date: string, entries: TimeOff[]): "all-day" | Interval[] {
  const intervals: Interval[] = [];
  for (const entry of entries) {
    const endDate = entry.endDate || entry.startDate;
    if (date < entry.startDate || date > endDate) continue;
    const { startTime, endTime } = entry;
    const validTimes =
      !!startTime && !!endTime && TIME_RE.test(startTime) && TIME_RE.test(endTime) && startTime < endTime;
    if (entry.allDay || !validTimes) return "all-day";
    intervals.push({
      start: zonedToUtc(date, startTime).getTime(),
      end: zonedToUtc(date, endTime).getTime(),
    });
  }
  return intervals;
}

/** Slots for one service on one date. */
export function computeDaySlots(input: AvailabilityInput & { date: string }): DayAvailability {
  const { date, settings, durationMinutes, now } = input;
  const hours = settings.weeklyHours.find((entry) => entry.day === weekdayOf(date));
  if (!hours || hours.closed || hours.open >= hours.close) return { closed: true, slots: [] };

  const blockedByTimeOff = timeOffFor(date, input.timeOff);
  if (blockedByTimeOff === "all-day") return { closed: true, slots: [] };

  const { firstBookableDate, lastBookableDate } = bookingWindow(settings, now);
  const inWindow = date >= firstBookableDate && date <= lastBookableDate;

  const durationMs = durationMinutes * 60_000;
  const bufferMs = settings.bufferMinutes * 60_000;
  const earliestStart = now.getTime() + settings.minNoticeMinutes * 60_000;
  const closeAt = zonedToUtc(date, hours.close).getTime();
  const busy = input.bookings.map(toInterval).filter((interval): interval is Interval => !!interval);
  const step = Math.max(5, Math.round(settings.slotIntervalMinutes));

  const slots: TimeSlot[] = [];
  for (let minute = timeToMinutes(hours.open); minute < 24 * 60; minute += step) {
    const time = minutesToTime(minute);
    const start = zonedToUtc(date, time).getTime();
    const end = start + durationMs;
    if (end > closeAt) break;

    let status: SlotStatus = "available";
    if (!inWindow) {
      status = "unavailable";
    } else if (busy.some((b) => start >= b.start && start < b.end)) {
      status = "booked";
    } else if (
      start < earliestStart ||
      blockedByTimeOff.some((t) => start < t.end && end > t.start) ||
      busy.some((b) => start < b.end + bufferMs && end + bufferMs > b.start)
    ) {
      status = "unavailable";
    }
    slots.push({ time, start: new Date(start).toISOString(), status });
  }
  return { closed: false, slots };
}

/** Calendar overview for a "YYYY-MM" month. */
export function summariseMonth(input: AvailabilityInput & { month: string }): {
  days: { date: string; status: CalendarDayStatus }[];
  firstBookableDate: string;
  lastBookableDate: string;
} {
  const { firstBookableDate, lastBookableDate } = bookingWindow(input.settings, input.now);
  const days = datesInMonth(input.month).map((date) => {
    if (date < firstBookableDate || date > lastBookableDate) {
      return { date, status: "unavailable" as const };
    }
    const day = computeDaySlots({ ...input, date });
    const status: CalendarDayStatus = day.closed
      ? "closed"
      : day.slots.some((slot) => slot.status === "available")
        ? "available"
        : "full";
    return { date, status };
  });
  return { days, firstBookableDate, lastBookableDate };
}

/** The dates whose bookings can affect slots on `from`…`to` (an appointment late the day before may run past midnight). */
export function bookingQueryRange(from: string, to: string): { from: string; to: string } {
  return { from: addDays(from, -1), to };
}
