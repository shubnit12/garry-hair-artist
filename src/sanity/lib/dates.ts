import { WEEKDAYS, type Weekday } from "../../lib/content/types";
import { BUSINESS_LOCALE, BUSINESS_TIMEZONE } from "../../lib/site";

/**
 * Small, dependency-free date helpers for the Studio (browser + Sanity CLI).
 *
 * Bookings store a wall-clock `date` ("YYYY-MM-DD") and `time` ("HH:mm") in
 * the business timezone. Calendar arithmetic is done on UTC midnights so it
 * never depends on the timezone of the computer Garry is using; "now" is
 * always read in America/Vancouver.
 */

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;
const DAY_MS = 86_400_000;

const businessClock = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
});

function businessParts(now: Date) {
  const parts = Object.fromEntries(
    businessClock.formatToParts(now).map((part) => [part.type, part.value]),
  ) as Record<string, string>;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

/** Today's date in Surrey, BC. */
export function businessToday(now: Date = new Date()): string {
  return businessParts(now).date;
}

/** Minutes since midnight right now in Surrey, BC. */
export function businessNowMinutes(now: Date = new Date()): number {
  return businessParts(now).minutes;
}

export function isDateString(value: unknown): value is string {
  if (typeof value !== "string" || !DATE_PATTERN.test(value)) return false;
  return toDateString(utcMidnight(value)) === value;
}

export function isTimeString(value: unknown): value is string {
  return typeof value === "string" && TIME_PATTERN.test(value);
}

function utcMidnight(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year!, month! - 1, day!));
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
  return toDateString(new Date(utcMidnight(date).getTime() + days * DAY_MS));
}

/** Weekday name used by the opening-hours settings ("monday" … "sunday"). */
export function weekdayOf(date: string): Weekday {
  // getUTCDay: 0 = Sunday … 6 = Saturday; WEEKDAYS starts on Monday.
  return WEEKDAYS[(utcMidnight(date).getUTCDay() + 6) % 7]!;
}

/** The Monday on or before `date`. */
export function startOfWeek(date: string): string {
  return addDays(date, -WEEKDAYS.indexOf(weekdayOf(date)));
}

/** Monday → Sunday of the week starting at `weekStart`. */
export function weekDates(weekStart: string): string[] {
  return Array.from({ length: 7 }, (_, index) => addDays(weekStart, index));
}

/** "14:30" → 870. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours! * 60 + minutes!;
}

/** 870 → "2:30 PM" (wraps past midnight). */
export function formatMinutes(totalMinutes: number): string {
  const minutesInDay = ((totalMinutes % 1440) + 1440) % 1440;
  const hours = Math.floor(minutesInDay / 60);
  const minutes = minutesInDay % 60;
  return `${hours % 12 || 12}:${String(minutes).padStart(2, "0")} ${hours >= 12 ? "PM" : "AM"}`;
}

/** "14:30" → "2:30 PM". Invalid input is returned unchanged. */
export function formatTime(time: string | undefined): string {
  return isTimeString(time) ? formatMinutes(timeToMinutes(time)) : (time ?? "--:--");
}

/** 840, 930 → "2:00 – 3:30 PM"; 690, 750 → "11:30 AM – 12:30 PM". */
export function formatMinutesRange(start: number, end: number): string {
  const from = formatMinutes(start);
  const to = formatMinutes(end);
  const [fromClock, fromPeriod] = from.split(" ");
  return fromPeriod === to.split(" ")[1] ? `${fromClock} – ${to}` : `${from} – ${to}`;
}

/** "14:00" + 90 → "2:00 – 3:30 PM". */
export function formatTimeRange(time: string | undefined, durationMinutes: number): string {
  if (!isTimeString(time)) return formatTime(time);
  const start = timeToMinutes(time);
  return formatMinutesRange(start, start + durationMinutes);
}

const dateFormatters = {
  short: new Intl.DateTimeFormat(BUSINESS_LOCALE, {
    timeZone: "UTC",
    weekday: "short",
    month: "short",
    day: "numeric",
  }),
  long: new Intl.DateTimeFormat(BUSINESS_LOCALE, {
    timeZone: "UTC",
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }),
  weekday: new Intl.DateTimeFormat(BUSINESS_LOCALE, { timeZone: "UTC", weekday: "short" }),
  dayOfMonth: new Intl.DateTimeFormat(BUSINESS_LOCALE, { timeZone: "UTC", day: "numeric" }),
  range: new Intl.DateTimeFormat(BUSINESS_LOCALE, {
    timeZone: "UTC",
    month: "short",
    day: "numeric",
    year: "numeric",
  }),
};

/** "2026-11-02" → "Mon, Nov 2" (style "short") or "Monday, November 2, 2026" ("long"). */
export function formatDate(date: string | undefined, style: "short" | "long" = "short"): string {
  return isDateString(date) ? dateFormatters[style].format(utcMidnight(date)) : (date ?? "No date");
}

/** Like `formatDate(date)`, adding the year only when it isn't the current one. */
export function formatDateCompact(date: string | undefined, now: Date = new Date()): string {
  if (!isDateString(date)) return date ?? "No date";
  const short = formatDate(date);
  return date.slice(0, 4) === businessToday(now).slice(0, 4) ? short : `${short}, ${date.slice(0, 4)}`;
}

const instantFormatter = new Intl.DateTimeFormat(BUSINESS_LOCALE, {
  timeZone: BUSINESS_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

/** ISO timestamp → "Nov 2, 2026, 2:30 p.m." in Surrey, BC time. */
export function formatInstant(iso: string | undefined): string | undefined {
  if (!iso) return undefined;
  const instant = new Date(iso);
  return Number.isNaN(instant.getTime()) ? undefined : instantFormatter.format(instant);
}

/** "2026-11-02" → "Mon". */
export function formatWeekday(date: string): string {
  return dateFormatters.weekday.format(utcMidnight(date));
}

/** "2026-11-02" → "2". */
export function formatDayOfMonth(date: string): string {
  return dateFormatters.dayOfMonth.format(utcMidnight(date));
}

/** Monday "2026-11-02" → "Nov 2 – 8, 2026". */
export function formatWeekRange(weekStart: string): string {
  return dateFormatters.range.formatRange(utcMidnight(weekStart), utcMidnight(addDays(weekStart, 6)));
}

/** Capitalised weekday name, e.g. "monday" → "Monday". */
export function weekdayTitle(day: Weekday): string {
  return day[0]!.toUpperCase() + day.slice(1);
}
