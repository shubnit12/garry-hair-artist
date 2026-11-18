import { BUSINESS_TIMEZONE } from "@/lib/site";

/**
 * Calendar helpers for "YYYY-MM-DD" date strings and "YYYY-MM" month strings.
 *
 * Dates are wall-calendar days in the business timezone, so arithmetic is done
 * on UTC midnights (no DST or browser-timezone drift). Labels are built from
 * fixed English names so server and client output always match.
 */

export const WEEKDAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

export const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const pad = (value: number) => String(value).padStart(2, "0");

function toUtc(date: string): Date {
  const [year, month, day] = date.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function fromUtc(value: Date): string {
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
}

const todayFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: BUSINESS_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Today's date in the business timezone, regardless of the visitor's timezone. */
export function todayInBusinessZone(now: Date = new Date()): string {
  const parts: Record<string, string> = {};
  for (const part of todayFormatter.formatToParts(now)) parts[part.type] = part.value;
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addDays(date: string, days: number): string {
  const value = toUtc(date);
  value.setUTCDate(value.getUTCDate() + days);
  return fromUtc(value);
}

export function monthOf(date: string): string {
  return date.slice(0, 7);
}

export function addMonths(month: string, count: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const index = year * 12 + (monthNumber - 1) + count;
  return `${Math.floor(index / 12)}-${pad((((index % 12) + 12) % 12) + 1)}`;
}

export function daysInMonth(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  return new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
}

/** 0 = Sunday … 6 = Saturday. */
export function weekdayIndex(date: string): number {
  return toUtc(date).getUTCDay();
}

/** Moves to the same day-of-month in another month, clamped to its length. */
export function shiftMonthKeepingDay(date: string, count: number): string {
  const target = addMonths(monthOf(date), count);
  const day = Math.min(Number(date.slice(8, 10)), daysInMonth(target));
  return `${target}-${pad(day)}`;
}

/** Sunday-first weeks for a month; days outside the month are `null`. */
export function monthGrid(month: string): (string | null)[][] {
  const leading = weekdayIndex(`${month}-01`);
  const total = daysInMonth(month);
  const cells: (string | null)[] = [
    ...Array.from({ length: leading }, () => null),
    ...Array.from({ length: total }, (_, index) => `${month}-${pad(index + 1)}`),
  ];
  while (cells.length % 7) cells.push(null);
  const weeks: (string | null)[][] = [];
  for (let index = 0; index < cells.length; index += 7) weeks.push(cells.slice(index, index + 7));
  return weeks;
}

/** "Friday, November 7, 2026" */
export function formatLongDate(date: string): string {
  return `${formatDayMonth(date)}, ${date.slice(0, 4)}`;
}

/** "Friday, November 7" */
export function formatDayMonth(date: string): string {
  const value = toUtc(date);
  return `${WEEKDAY_NAMES[value.getUTCDay()]}, ${MONTH_NAMES[value.getUTCMonth()]} ${value.getUTCDate()}`;
}

/** "Fri, Nov 7" */
export function formatShortDate(date: string): string {
  const value = toUtc(date);
  return `${WEEKDAY_NAMES[value.getUTCDay()].slice(0, 3)}, ${MONTH_NAMES[value.getUTCMonth()].slice(0, 3)} ${value.getUTCDate()}`;
}

/** "November 2026" */
export function formatMonthLabel(month: string): string {
  const [year, monthNumber] = month.split("-").map(Number);
  return `${MONTH_NAMES[monthNumber - 1]} ${year}`;
}

export type DayPeriod = "morning" | "afternoon" | "evening";

export const DAY_PERIODS: { value: DayPeriod; label: string }[] = [
  { value: "morning", label: "Morning" },
  { value: "afternoon", label: "Afternoon" },
  { value: "evening", label: "Evening" },
];

/** Morning before 12:00, afternoon until 17:00, evening after. */
export function periodOf(time: string): DayPeriod {
  const hour = Number(time.slice(0, 2));
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
