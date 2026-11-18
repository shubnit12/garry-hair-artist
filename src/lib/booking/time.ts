import { TZDate } from "@date-fns/tz";

import { WEEKDAYS, type Weekday } from "@/lib/content/types";
import { BUSINESS_TIMEZONE } from "@/lib/site";

/**
 * Calendar + timezone helpers for the booking engine.
 *
 * Dates are "YYYY-MM-DD" and times "HH:mm" in the business timezone. Pure
 * calendar arithmetic (adding days, weekdays, month grids) is done on UTC
 * midnights so it never depends on the server's own timezone; conversions to
 * absolute instants go through the IANA database via `TZDate`, so DST (or a
 * permanent change of offset) is handled by the platform's tz data.
 */

const MINUTE_MS = 60_000;

type DateParts = { year: number; month: number; day: number };

function parseDateParts(date: string): DateParts {
  const [year, month, day] = date.split("-").map(Number);
  return { year: year!, month: month!, day: day! };
}

function utcMidnight(date: string): Date {
  const { year, month, day } = parseDateParts(date);
  return new Date(Date.UTC(year, month - 1, day));
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

/** True for a well-formed, real calendar date (rejects e.g. "2026-02-30"). */
export function isValidDate(date: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  return toDateString(utcMidnight(date)) === date;
}

/** "14:30" → 870. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! * 60 + minutes!;
}

/** 870 → "14:30". */
export function minutesToTime(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

/** Wall-clock date + time in `timeZone` → absolute instant. */
export function zonedToUtc(date: string, time: string, timeZone = BUSINESS_TIMEZONE): Date {
  const { year, month, day } = parseDateParts(date);
  const [hours, minutes] = time.split(":").map(Number);
  const zoned = new TZDate(year, month - 1, day, hours!, minutes!, timeZone);
  return new Date(zoned.getTime());
}

/** Absolute instant → wall-clock date + time in `timeZone`. */
export function utcToZoned(
  instant: Date | number,
  timeZone = BUSINESS_TIMEZONE,
): { date: string; time: string } {
  const zoned = new TZDate(typeof instant === "number" ? instant : instant.getTime(), timeZone);
  const date = [
    zoned.getFullYear(),
    String(zoned.getMonth() + 1).padStart(2, "0"),
    String(zoned.getDate()).padStart(2, "0"),
  ].join("-");
  return { date, time: minutesToTime(zoned.getHours() * 60 + zoned.getMinutes()) };
}

/** Today's date in the business timezone for the given moment. */
export function businessToday(now: Date, timeZone = BUSINESS_TIMEZONE): string {
  return utcToZoned(now, timeZone).date;
}

export function addDays(date: string, days: number): string {
  const value = utcMidnight(date);
  value.setUTCDate(value.getUTCDate() + days);
  return toDateString(value);
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: string, to: string): number {
  return Math.round((utcMidnight(to).getTime() - utcMidnight(from).getTime()) / 86_400_000);
}

export function weekdayOf(date: string): Weekday {
  // getUTCDay: 0 = Sunday … 6 = Saturday; WEEKDAYS starts on Monday.
  return WEEKDAYS[(utcMidnight(date).getUTCDay() + 6) % 7]!;
}

/** Every date of a "YYYY-MM" month, in order. */
export function datesInMonth(month: string): string[] {
  const [year, monthIndex] = month.split("-").map(Number);
  const count = new Date(Date.UTC(year!, monthIndex!, 0)).getUTCDate();
  return Array.from({ length: count }, (_, index) => `${month}-${String(index + 1).padStart(2, "0")}`);
}

export function addMinutes(instant: Date, minutes: number): Date {
  return new Date(instant.getTime() + minutes * MINUTE_MS);
}

const longDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "long",
  month: "long",
  day: "numeric",
  year: "numeric",
});

const shortDate = new Intl.DateTimeFormat("en-CA", {
  timeZone: "UTC",
  weekday: "short",
  month: "short",
  day: "numeric",
});

/** "2026-11-07" → "Saturday, November 7, 2026". */
export function formatLongDate(date: string): string {
  return longDate.format(utcMidnight(date));
}

/** "2026-11-07" → "Sat, Nov 7". */
export function formatShortDate(date: string): string {
  return shortDate.format(utcMidnight(date));
}
