import { describe, expect, it } from "vitest";

import { findConflicts, overlappingIds } from "./conflicts";
import { isActiveStatus, normaliseStatus } from "./constants";
import {
  addDays,
  businessNowMinutes,
  businessToday,
  formatDateCompact,
  formatInstant,
  formatTime,
  formatTimeRange,
  formatWeekRange,
  isDateString,
  startOfWeek,
  weekDates,
  weekdayOf,
} from "./dates";
import { isAllDayTimeOff, resolveBufferMinutes, resolveWeeklyHours, timeOffCoversDate, timeOffWindow } from "./hours";

describe("dates", () => {
  it("reads today in America/Vancouver, not UTC", () => {
    // 2026-11-01T06:30Z is still Oct 31, 11:30 PM in Vancouver (PDT, UTC-7).
    const instant = new Date("2026-11-01T06:30:00Z");
    expect(businessToday(instant)).toBe("2026-10-31");
    expect(businessNowMinutes(instant)).toBe(23 * 60 + 30);
  });

  it("handles midnight as 00:00", () => {
    expect(businessNowMinutes(new Date("2026-07-01T07:00:00Z"))).toBe(0);
  });

  it("does calendar arithmetic across month and DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 1)).toBe("2026-11-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("starts weeks on Monday", () => {
    expect(weekdayOf("2026-11-02")).toBe("monday");
    expect(weekdayOf("2026-11-08")).toBe("sunday");
    expect(startOfWeek("2026-11-08")).toBe("2026-11-02");
    expect(startOfWeek("2026-11-02")).toBe("2026-11-02");
    expect(weekDates("2026-11-02")).toEqual([
      "2026-11-02",
      "2026-11-03",
      "2026-11-04",
      "2026-11-05",
      "2026-11-06",
      "2026-11-07",
      "2026-11-08",
    ]);
  });

  it("validates date strings", () => {
    expect(isDateString("2026-02-28")).toBe(true);
    expect(isDateString("2026-02-30")).toBe(false);
    expect(isDateString("Nov 2")).toBe(false);
  });

  it("formats times for humans", () => {
    expect(formatTime("00:15")).toBe("12:15 AM");
    expect(formatTime("12:00")).toBe("12:00 PM");
    expect(formatTime("14:30")).toBe("2:30 PM");
    expect(formatTimeRange("14:00", 90)).toBe("2:00 – 3:30 PM");
    expect(formatTimeRange("11:30", 60)).toBe("11:30 AM – 12:30 PM");
    expect(formatWeekRange("2026-11-02")).toMatch(/Nov(\.)? 2/);
  });

  it("adds the year to dates outside the current year only", () => {
    const now = new Date("2026-10-31T19:00:00Z");
    expect(formatDateCompact("2026-11-03", now)).toBe("Tue, Nov 3");
    expect(formatDateCompact("2025-11-03", now)).toBe("Mon, Nov 3, 2025");
    expect(formatDateCompact(undefined, now)).toBe("No date");
  });

  it("formats timestamps in Surrey time", () => {
    // 2026-11-01T06:30Z is Oct 31, 11:30 PM in Vancouver.
    expect(formatInstant("2026-11-01T06:30:00Z")).toMatch(/Oct 31, 2026/);
    expect(formatInstant("not a date")).toBeUndefined();
  });
});

describe("conflicts", () => {
  const others = [
    { id: "a", time: "10:00", durationMinutes: 60 },
    { id: "b", time: "13:00", durationMinutes: 30 },
  ];

  it("detects overlapping appointments", () => {
    expect(findConflicts({ time: "10:30", durationMinutes: 60 }, others, 15)).toEqual([
      { kind: "overlap", other: others[0] },
    ]);
  });

  it("treats back-to-back bookings inside the buffer as a buffer conflict", () => {
    expect(findConflicts({ time: "11:00", durationMinutes: 30 }, others, 15)).toEqual([
      { kind: "buffer", other: others[0] },
    ]);
    expect(findConflicts({ time: "11:15", durationMinutes: 30 }, others, 15)).toEqual([]);
  });

  it("ignores appointments without a valid time", () => {
    expect(findConflicts({ time: "", durationMinutes: 30 }, others, 15)).toEqual([]);
  });

  it("finds every overlapping appointment in a day", () => {
    const day = [...others, { id: "c", time: "10:45", durationMinutes: 30 }];
    expect([...overlappingIds(day)].sort()).toEqual(["a", "c"]);
  });
});

describe("hours", () => {
  it("falls back to the default hours when none are set", () => {
    const hours = resolveWeeklyHours(undefined);
    expect(hours.monday.closed).toBe(true);
    expect(hours.tuesday).toMatchObject({ closed: false, open: "10:00", close: "19:00" });
  });

  it("closes days that are missing once any hours are entered", () => {
    const hours = resolveWeeklyHours([{ day: "tuesday", closed: false, open: "09:00", close: "17:00" }]);
    expect(hours.tuesday).toMatchObject({ closed: false, open: "09:00", close: "17:00" });
    expect(hours.wednesday.closed).toBe(true);
  });

  it("treats impossible hours as closed", () => {
    expect(resolveWeeklyHours([{ day: "friday", open: "18:00", close: "09:00" }]).friday.closed).toBe(true);
  });

  it("clamps the buffer", () => {
    expect(resolveBufferMinutes(undefined)).toBe(15);
    expect(resolveBufferMinutes(500)).toBe(120);
  });

  it("matches time off to dates", () => {
    const vacation = { startDate: "2026-12-24", endDate: "2026-12-27" };
    expect(timeOffCoversDate(vacation, "2026-12-25")).toBe(true);
    expect(timeOffCoversDate(vacation, "2026-12-28")).toBe(false);
    expect(timeOffWindow(vacation)).toBeNull();
    expect(timeOffWindow({ allDay: false, startTime: "12:00", endTime: "13:30" })).toEqual({
      start: 720,
      end: 810,
    });
  });

  it("closes the whole day for partial time off with missing, empty or inverted times (like the website)", () => {
    expect(isAllDayTimeOff({ allDay: false, startTime: "14:00", endTime: "13:00" })).toBe(true);
    expect(isAllDayTimeOff({ allDay: false, startTime: "14:00", endTime: "14:00" })).toBe(true);
    expect(isAllDayTimeOff({ allDay: false, startTime: "14:00" })).toBe(true);
    expect(timeOffWindow({ allDay: false, startTime: "14:00", endTime: "13:00" })).toBeNull();
    expect(isAllDayTimeOff({ allDay: false, startTime: "13:00", endTime: "14:00" })).toBe(false);
  });
});

describe("statuses", () => {
  it("treats a missing or unknown status as confirmed, like the booking engine", () => {
    expect(normaliseStatus(undefined)).toBe("confirmed");
    expect(normaliseStatus("bogus")).toBe("confirmed");
    expect(normaliseStatus("pending")).toBe("pending");
    expect(isActiveStatus(undefined)).toBe(true);
    expect(isActiveStatus("cancelled")).toBe(false);
  });
});
