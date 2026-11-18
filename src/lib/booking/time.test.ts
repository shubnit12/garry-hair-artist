import { describe, expect, it } from "vitest";

import {
  addDays,
  businessToday,
  datesInMonth,
  daysBetween,
  formatLongDate,
  formatShortDate,
  isValidDate,
  minutesToTime,
  timeToMinutes,
  utcToZoned,
  weekdayOf,
  zonedToUtc,
} from "./time";

const ZONE = "America/Vancouver";

/** Wall clock of an instant according to the platform's Intl tz data (independent of TZDate). */
function intlWallClock(instant: Date): { date: string; time: string } {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: ZONE,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(instant)
      .map((part) => [part.type, part.value]),
  );
  return { date: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}

describe("calendar arithmetic", () => {
  it("validates real calendar dates", () => {
    expect(isValidDate("2026-11-07")).toBe(true);
    expect(isValidDate("2028-02-29")).toBe(true);
    expect(isValidDate("2026-02-29")).toBe(false);
    expect(isValidDate("2026-02-30")).toBe(false);
    expect(isValidDate("2026-13-01")).toBe(false);
    expect(isValidDate("2026-1-01")).toBe(false);
  });

  it("converts between HH:mm and minutes", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("14:30")).toBe(870);
    expect(minutesToTime(870)).toBe("14:30");
    expect(minutesToTime(5)).toBe("00:05");
  });

  it("adds days across month, year and leap-day boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2026-11-02", 60)).toBe("2027-01-01");
    // Day arithmetic is calendar-based, not 24h-based, so clock changes never skip a date.
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2027-03-14", 1)).toBe("2027-03-15");
  });

  it("counts whole days between dates", () => {
    expect(daysBetween("2026-11-01", "2026-11-08")).toBe(7);
    expect(daysBetween("2026-11-08", "2026-11-01")).toBe(-7);
    expect(daysBetween("2027-03-13", "2027-03-15")).toBe(2);
  });

  it("resolves weekdays", () => {
    expect(weekdayOf("2026-11-01")).toBe("sunday");
    expect(weekdayOf("2026-11-02")).toBe("monday");
    expect(weekdayOf("2026-11-07")).toBe("saturday");
    expect(weekdayOf("2027-03-14")).toBe("sunday");
  });

  it("enumerates the days of a month", () => {
    expect(datesInMonth("2026-11")).toHaveLength(30);
    expect(datesInMonth("2026-11")[0]).toBe("2026-11-01");
    expect(datesInMonth("2026-11").at(-1)).toBe("2026-11-30");
    expect(datesInMonth("2028-02")).toHaveLength(29);
    expect(datesInMonth("2027-02")).toHaveLength(28);
  });

  it("formats dates for emails", () => {
    expect(formatLongDate("2026-11-07")).toBe("Saturday, November 7, 2026");
    expect(formatShortDate("2026-11-07")).toBe("Sat, Nov 7");
  });
});

describe("timezone conversion", () => {
  it("handles the historical fall-back transition (2025-11-02, PDT → PST)", () => {
    expect(zonedToUtc("2025-11-01", "10:00").toISOString()).toBe("2025-11-01T17:00:00.000Z");
    expect(zonedToUtc("2025-11-02", "10:00").toISOString()).toBe("2025-11-02T18:00:00.000Z");
    expect(utcToZoned(new Date("2025-11-02T18:00:00Z"))).toEqual({ date: "2025-11-02", time: "10:00" });
    // The day is 25 hours long: midnight to midnight.
    const length = zonedToUtc("2025-11-03", "00:00").getTime() - zonedToUtc("2025-11-02", "00:00").getTime();
    expect(length).toBe(25 * 3_600_000);
  });

  it("handles the historical spring-forward transition (2026-03-08, PST → PDT)", () => {
    expect(zonedToUtc("2026-03-07", "10:00").toISOString()).toBe("2026-03-07T18:00:00.000Z");
    expect(zonedToUtc("2026-03-08", "10:00").toISOString()).toBe("2026-03-08T17:00:00.000Z");
    const length = zonedToUtc("2026-03-09", "00:00").getTime() - zonedToUtc("2026-03-08", "00:00").getTime();
    expect(length).toBe(23 * 3_600_000);
  });

  // 2026-11-01 and 2027-03-14 are the next scheduled clock changes. Whether
  // they happen depends on the platform's tz database (BC's permanent-time
  // legislation), so the expectations come from Intl rather than fixed offsets.
  it.each(["2026-10-31", "2026-11-01", "2026-11-02", "2027-03-13", "2027-03-14", "2027-03-15"])(
    "round-trips every business-hours wall time on %s",
    (date) => {
      for (let minute = 4 * 60; minute < 24 * 60; minute += 30) {
        const time = minutesToTime(minute);
        const instant = zonedToUtc(date, time);
        expect(intlWallClock(instant)).toEqual({ date, time });
        expect(utcToZoned(instant)).toEqual({ date, time });
      }
    },
  );

  it("keeps same-day business hours a fixed real duration apart across 2026-11-01 and 2027-03-14", () => {
    for (const date of ["2026-11-01", "2027-03-14"]) {
      const open = zonedToUtc(date, "10:00").getTime();
      const close = zonedToUtc(date, "18:00").getTime();
      expect(close - open).toBe(8 * 3_600_000);
    }
  });

  it("derives today's business date from an instant, independent of the server timezone", () => {
    // Before 2026-11-01T09:00Z every tz version has Vancouver at UTC-7.
    expect(businessToday(new Date("2026-11-01T06:59:00Z"))).toBe("2026-10-31");
    expect(businessToday(new Date("2026-11-01T07:00:00Z"))).toBe("2026-11-01");
    // Afterwards, agree with the platform's tz data.
    const later = new Date("2026-11-02T07:30:00Z");
    expect(businessToday(later)).toBe(intlWallClock(later).date);
  });
});
