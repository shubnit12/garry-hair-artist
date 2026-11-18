import { fallbackBookingSettings } from "../../lib/content/fallback";
import { WEEKDAYS, type OpeningHours, type Weekday } from "../../lib/content/types";
import { isTimeString, timeToMinutes } from "./dates";

/**
 * Studio-side mirror of how the website reads opening hours and time off
 * (see `normaliseBookingSettings` in lib/content/normalize.ts), so warnings in
 * the Studio match what clients can actually book.
 */

export type RawOpeningHours = {
  day?: string | null;
  closed?: boolean | null;
  open?: string | null;
  close?: string | null;
} | null;

export type WeeklyHours = Record<Weekday, OpeningHours>;

export function resolveWeeklyHours(raw: readonly RawOpeningHours[] | null | undefined): WeeklyHours {
  const entries = Array.isArray(raw) ? raw : [];

  return Object.fromEntries(
    WEEKDAYS.map((day) => {
      const fromCms = entries.find((entry) => entry?.day === day);
      const fallbackDay = fallbackBookingSettings.weeklyHours.find((entry) => entry.day === day)!;
      // Once Garry has entered any hours, days he left out are closed.
      if (!fromCms) return [day, entries.length ? { ...fallbackDay, closed: true } : fallbackDay];

      const open = isTimeString(fromCms.open) ? fromCms.open : fallbackDay.open;
      const close = isTimeString(fromCms.close) ? fromCms.close : fallbackDay.close;
      return [day, { day, closed: Boolean(fromCms.closed) || open >= close, open, close }];
    }),
  ) as WeeklyHours;
}

export function resolveBufferMinutes(raw: unknown): number {
  return typeof raw === "number" && Number.isFinite(raw)
    ? Math.min(120, Math.max(0, raw))
    : fallbackBookingSettings.bufferMinutes;
}

export type TimeOffEntry = {
  _id?: string;
  reason?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  allDay?: boolean | null;
  startTime?: string | null;
  endTime?: string | null;
};

/**
 * All-day unless explicitly switched off with a valid window. Like the booking
 * engine, a partial entry with missing, empty or inverted times closes the day.
 */
export function isAllDayTimeOff(entry: TimeOffEntry): boolean {
  return (
    entry.allDay !== false ||
    !isTimeString(entry.startTime) ||
    !isTimeString(entry.endTime) ||
    entry.startTime >= entry.endTime
  );
}

export function timeOffCoversDate(entry: TimeOffEntry, date: string): boolean {
  if (!entry.startDate) return false;
  const end = entry.endDate || entry.startDate;
  return entry.startDate <= date && date <= end;
}

/** Minutes [start, end) blocked by a partial-day time off entry, or null when all day. */
export function timeOffWindow(entry: TimeOffEntry): { start: number; end: number } | null {
  if (isAllDayTimeOff(entry)) return null;
  return { start: timeToMinutes(entry.startTime!), end: timeToMinutes(entry.endTime!) };
}
