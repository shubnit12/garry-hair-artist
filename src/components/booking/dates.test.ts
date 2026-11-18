import { describe, expect, it } from "vitest";

import {
  addDays,
  addMonths,
  daysInMonth,
  formatDayMonth,
  formatLongDate,
  formatMonthLabel,
  formatShortDate,
  monthGrid,
  periodOf,
  shiftMonthKeepingDay,
  todayInBusinessZone,
  weekdayIndex,
} from "./dates";

describe("todayInBusinessZone", () => {
  it("uses Vancouver time, not UTC", () => {
    // 2026-11-07 06:30 UTC is still Nov 6 (22:30 PST) in Vancouver.
    expect(todayInBusinessZone(new Date("2026-11-07T06:30:00Z"))).toBe("2026-11-06");
    expect(todayInBusinessZone(new Date("2026-11-07T08:30:00Z"))).toBe("2026-11-07");
  });

  it("handles the DST change", () => {
    // 2026-03-08 is the spring-forward date; 07:30 UTC = 23:30 PST on Mar 7.
    expect(todayInBusinessZone(new Date("2026-03-08T07:30:00Z"))).toBe("2026-03-07");
    // 2026-07-01 06:59 UTC = 23:59 PDT on Jun 30.
    expect(todayInBusinessZone(new Date("2026-07-01T06:59:00Z"))).toBe("2026-06-30");
  });
});

describe("date arithmetic", () => {
  it("adds days across months, years and DST boundaries", () => {
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-11-01", 7)).toBe("2026-11-08");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
    expect(addDays("2028-02-28", 1)).toBe("2028-02-29");
  });

  it("adds months across years", () => {
    expect(addMonths("2026-11", 1)).toBe("2026-12");
    expect(addMonths("2026-12", 1)).toBe("2027-01");
    expect(addMonths("2027-01", -1)).toBe("2026-12");
    expect(addMonths("2026-05", -17)).toBe("2024-12");
  });

  it("counts days in month including leap years", () => {
    expect(daysInMonth("2026-02")).toBe(28);
    expect(daysInMonth("2028-02")).toBe(29);
    expect(daysInMonth("2026-11")).toBe(30);
    expect(daysInMonth("2026-12")).toBe(31);
  });

  it("shifts months keeping the day where possible", () => {
    expect(shiftMonthKeepingDay("2026-01-31", 1)).toBe("2026-02-28");
    expect(shiftMonthKeepingDay("2026-11-15", -1)).toBe("2026-10-15");
  });

  it("knows the weekday", () => {
    expect(weekdayIndex("2026-11-01")).toBe(0); // Sunday
    expect(weekdayIndex("2026-11-07")).toBe(6); // Saturday
  });
});

describe("monthGrid", () => {
  it("builds Sunday-first weeks padded with nulls", () => {
    const weeks = monthGrid("2026-10"); // Oct 1 2026 is a Thursday
    expect(weeks[0]).toEqual([null, null, null, null, "2026-10-01", "2026-10-02", "2026-10-03"]);
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(31);
    expect(weeks.at(-1)).toEqual(["2026-10-25", "2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31"]);
  });

  it("starts on the first cell when the month begins on Sunday", () => {
    expect(monthGrid("2026-11")[0][0]).toBe("2026-11-01");
  });
});

describe("labels", () => {
  it("formats dates without depending on the runtime locale", () => {
    expect(formatLongDate("2026-11-06")).toBe("Friday, November 6, 2026");
    expect(formatDayMonth("2026-11-06")).toBe("Friday, November 6");
    expect(formatShortDate("2026-11-06")).toBe("Fri, Nov 6");
    expect(formatMonthLabel("2026-11")).toBe("November 2026");
  });

  it("groups times into periods", () => {
    expect(periodOf("09:30")).toBe("morning");
    expect(periodOf("11:59")).toBe("morning");
    expect(periodOf("12:00")).toBe("afternoon");
    expect(periodOf("16:30")).toBe("afternoon");
    expect(periodOf("17:00")).toBe("evening");
  });
});
