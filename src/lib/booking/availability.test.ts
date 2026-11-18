import { describe, expect, it } from "vitest";

import type { BookingSettings, TimeOff } from "@/lib/content/types";

import {
  bookingWindow,
  computeDaySlots,
  summariseMonth,
  type AvailabilityInput,
  type BusyBooking,
} from "./availability";
import { utcToZoned, zonedToUtc } from "./time";
import type { SlotStatus } from "./types";

const settings: AvailabilityInput["settings"] = {
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  minNoticeMinutes: 120,
  maxAdvanceDays: 60,
  weeklyHours: [
    { day: "monday", closed: true, open: "10:00", close: "19:00" },
    { day: "tuesday", closed: false, open: "10:00", close: "19:00" },
    { day: "wednesday", closed: false, open: "10:00", close: "19:00" },
    { day: "thursday", closed: false, open: "10:00", close: "19:00" },
    { day: "friday", closed: false, open: "10:00", close: "19:00" },
    { day: "saturday", closed: false, open: "09:00", close: "18:00" },
    { day: "sunday", closed: false, open: "11:00", close: "17:00" },
  ] satisfies BookingSettings["weeklyHours"],
};

/** Monday 2026-11-02, 08:00 in Surrey. */
const NOW = zonedToUtc("2026-11-02", "08:00");
const TUESDAY = "2026-11-10";

function day(
  date: string,
  overrides: Partial<AvailabilityInput> = {},
): ReturnType<typeof computeDaySlots> {
  return computeDaySlots({
    date,
    settings,
    durationMinutes: 60,
    bookings: [],
    timeOff: [],
    now: NOW,
    ...overrides,
  });
}

function statuses(result: ReturnType<typeof computeDaySlots>): Record<string, SlotStatus> {
  return Object.fromEntries(result.slots.map((slot) => [slot.time, slot.status]));
}

const booking = (time: string, durationMinutes: number, date = TUESDAY): BusyBooking => ({
  date,
  time,
  durationMinutes,
});

const timeOff = (entry: Partial<TimeOff> & Pick<TimeOff, "startDate">): TimeOff => ({
  id: "off",
  endDate: entry.startDate,
  allDay: true,
  ...entry,
});

describe("computeDaySlots — opening hours", () => {
  it("closes on a closed weekday", () => {
    expect(day("2026-11-09")).toEqual({ closed: true, slots: [] });
  });

  it("offers starts from opening time while the service still ends by closing time", () => {
    const result = day(TUESDAY);
    expect(result.closed).toBe(false);
    expect(result.slots[0]!.time).toBe("10:00");
    expect(result.slots.at(-1)!.time).toBe("18:00");
    expect(result.slots).toHaveLength(17);
    expect(result.slots.every((slot) => slot.status === "available")).toBe(true);
  });

  it("stops earlier for long services", () => {
    const result = day(TUESDAY, { durationMinutes: 150 });
    expect(result.slots.at(-1)!.time).toBe("16:30");
  });

  it("steps by the configured interval", () => {
    const result = day(TUESDAY, { settings: { ...settings, slotIntervalMinutes: 45 } });
    expect(result.slots.slice(0, 4).map((slot) => slot.time)).toEqual(["10:00", "10:45", "11:30", "12:15"]);
    expect(result.slots.at(-1)!.time).toBe("17:30");
  });

  it("uses each weekday's own hours", () => {
    const saturday = day("2026-11-07");
    expect(saturday.slots[0]!.time).toBe("09:00");
    expect(saturday.slots.at(-1)!.time).toBe("17:00");
  });

  it("returns UTC start instants that match the wall-clock label", () => {
    for (const slot of day(TUESDAY).slots) {
      expect(utcToZoned(new Date(slot.start))).toEqual({ date: TUESDAY, time: slot.time });
    }
  });
});

describe("computeDaySlots — notice and booking window", () => {
  it("marks past slots and slots inside the minimum notice as unavailable", () => {
    const now = zonedToUtc(TUESDAY, "11:10"); // earliest start: 13:10
    const result = statuses(day(TUESDAY, { now }));
    expect(result["10:00"]).toBe("unavailable");
    expect(result["13:00"]).toBe("unavailable");
    expect(result["13:30"]).toBe("available");
  });

  it("treats a start exactly at the notice boundary as available", () => {
    const now = zonedToUtc(TUESDAY, "11:30");
    expect(statuses(day(TUESDAY, { now }))["13:30"]).toBe("available");
    expect(statuses(day(TUESDAY, { now }))["13:00"]).toBe("unavailable");
  });

  it("makes every slot unavailable on past days and beyond the advance window", () => {
    // Window from Monday 2026-11-02: last bookable date is 2027-01-01 (a Friday).
    expect(day("2027-01-01").slots.some((slot) => slot.status === "available")).toBe(true);
    expect(day("2027-01-02").slots.every((slot) => slot.status === "unavailable")).toBe(true);
    expect(day("2026-10-31").slots.every((slot) => slot.status === "unavailable")).toBe(true);
  });

  it("computes the booking window, rolling to tomorrow when notice runs past midnight", () => {
    expect(bookingWindow(settings, NOW)).toEqual({
      firstBookableDate: "2026-11-02",
      lastBookableDate: "2027-01-01",
    });
    expect(bookingWindow(settings, zonedToUtc(TUESDAY, "23:00"))).toEqual({
      firstBookableDate: "2026-11-11",
      lastBookableDate: "2027-01-09",
    });
  });
});

describe("computeDaySlots — existing bookings", () => {
  it("distinguishes booked slots from buffer conflicts", () => {
    const result = statuses(day(TUESDAY, { bookings: [booking("12:00", 60)] }));
    // Inside the appointment itself.
    expect(result["12:00"]).toBe("booked");
    expect(result["12:30"]).toBe("booked");
    // Inside the 15-minute clean-up buffer after it.
    expect(result["13:00"]).toBe("unavailable");
    expect(result["13:30"]).toBe("available");
    // Would run into the appointment (plus buffer) if started here.
    expect(result["11:00"]).toBe("unavailable");
    expect(result["11:30"]).toBe("unavailable");
    expect(result["10:30"]).toBe("available");
  });

  it("lets a long appointment block every start it covers", () => {
    const result = statuses(day(TUESDAY, { bookings: [booking("14:00", 150)] }));
    for (const time of ["14:00", "14:30", "15:00", "15:30", "16:00"]) expect(result[time]).toBe("booked");
    expect(result["16:30"]).toBe("unavailable"); // buffer until 16:45
    expect(result["17:00"]).toBe("available");
    expect(result["13:00"]).toBe("unavailable");
    expect(result["12:30"]).toBe("available");
  });

  it("blocks earlier starts for long services that would overlap a later booking", () => {
    const result = statuses(day(TUESDAY, { durationMinutes: 150, bookings: [booking("14:00", 60)] }));
    expect(result["11:00"]).toBe("available"); // ends 13:30 + 15 buffer = 13:45
    expect(result["11:30"]).toBe("unavailable");
    expect(result["12:00"]).toBe("unavailable");
    expect(result["14:00"]).toBe("booked");
    expect(result["15:00"]).toBe("unavailable"); // buffer until 15:15
    expect(result["15:30"]).toBe("available");
  });

  it("respects a zero buffer", () => {
    const zeroBuffer = { ...settings, bufferMinutes: 0 };
    const result = statuses(day(TUESDAY, { settings: zeroBuffer, bookings: [booking("12:00", 60)] }));
    expect(result["11:00"]).toBe("available");
    expect(result["13:00"]).toBe("available");
  });

  it("accounts for an appointment from the previous day that runs past midnight", () => {
    const late: BusyBooking = { date: "2026-11-09", time: "23:30", durationMinutes: 12 * 60 };
    const result = statuses(day(TUESDAY, { bookings: [late] }));
    expect(result["10:00"]).toBe("booked");
    expect(result["11:30"]).toBe("unavailable");
    expect(result["12:00"]).toBe("available");
  });
});

describe("computeDaySlots — time off", () => {
  it("closes the day for all-day time off, including multi-day ranges", () => {
    expect(day(TUESDAY, { timeOff: [timeOff({ startDate: TUESDAY })] })).toEqual({ closed: true, slots: [] });
    const range = [timeOff({ startDate: "2026-11-09", endDate: "2026-11-12" })];
    expect(day("2026-11-11", { timeOff: range }).closed).toBe(true);
    expect(day("2026-11-13", { timeOff: range }).closed).toBe(false);
  });

  it("blocks only overlapping slots for partial time off", () => {
    const off = [timeOff({ startDate: TUESDAY, allDay: false, startTime: "13:00", endTime: "14:00" })];
    const result = statuses(day(TUESDAY, { timeOff: off }));
    expect(result["12:00"]).toBe("available"); // ends exactly at 13:00
    expect(result["12:30"]).toBe("unavailable");
    expect(result["13:00"]).toBe("unavailable");
    expect(result["13:30"]).toBe("unavailable");
    expect(result["14:00"]).toBe("available");
  });

  it("treats partial time off with missing or inverted times as all-day", () => {
    expect(day(TUESDAY, { timeOff: [timeOff({ startDate: TUESDAY, allDay: false })] }).closed).toBe(true);
    const inverted = timeOff({ startDate: TUESDAY, allDay: false, startTime: "15:00", endTime: "14:00" });
    expect(day(TUESDAY, { timeOff: [inverted] }).closed).toBe(true);
  });

  it("keeps booked status ahead of time off", () => {
    const off = [timeOff({ startDate: TUESDAY, allDay: false, startTime: "12:00", endTime: "16:00" })];
    const result = statuses(day(TUESDAY, { timeOff: off, bookings: [booking("12:00", 60)] }));
    expect(result["12:00"]).toBe("booked");
    expect(result["14:00"]).toBe("unavailable");
  });
});

describe("computeDaySlots — clock-change days", () => {
  it.each(["2026-11-01", "2027-03-14"])("labels and spaces slots by wall-clock time on %s", (date) => {
    const now = zonedToUtc(addWeekBefore(date), "08:00");
    const result = day(date, { now, bookings: [booking("13:00", 60, date)] });
    expect(result.closed).toBe(false);
    expect(result.slots.map((slot) => slot.time)).toEqual([
      "11:00", "11:30", "12:00", "12:30", "13:00", "13:30", "14:00", "14:30", "15:00", "15:30", "16:00",
    ]);
    for (let index = 1; index < result.slots.length; index++) {
      const gap = Date.parse(result.slots[index]!.start) - Date.parse(result.slots[index - 1]!.start);
      expect(gap).toBe(30 * 60_000);
    }
    for (const slot of result.slots) expect(utcToZoned(new Date(slot.start))).toEqual({ date, time: slot.time });
    const byTime = statuses(result);
    expect(byTime["13:00"]).toBe("booked");
    expect(byTime["14:00"]).toBe("unavailable");
    expect(byTime["14:30"]).toBe("available");
  });

  it("uses standard time after the historical 2025-11-02 fall-back", () => {
    const now = zonedToUtc("2025-10-26", "08:00");
    const result = day("2025-11-02", { now });
    expect(result.slots[0]).toEqual({ time: "11:00", start: "2025-11-02T19:00:00.000Z", status: "available" });
  });
});

describe("summariseMonth", () => {
  it("summarises each day's status and the bookable window", () => {
    const summary = summariseMonth({
      month: "2026-11",
      settings,
      durationMinutes: 60,
      now: NOW,
      bookings: [],
      timeOff: [
        timeOff({ startDate: "2026-11-04", allDay: false, startTime: "10:00", endTime: "19:00" }),
        timeOff({ startDate: "2026-11-05" }),
      ],
    });
    const byDate = Object.fromEntries(summary.days.map((entry) => [entry.date, entry.status]));
    expect(summary.days).toHaveLength(30);
    expect(summary.firstBookableDate).toBe("2026-11-02");
    expect(summary.lastBookableDate).toBe("2027-01-01");
    expect(byDate["2026-11-01"]).toBe("unavailable"); // past
    expect(byDate["2026-11-02"]).toBe("closed"); // Monday
    expect(byDate["2026-11-03"]).toBe("available");
    expect(byDate["2026-11-04"]).toBe("full"); // open, but every slot blocked
    expect(byDate["2026-11-05"]).toBe("closed"); // all-day time off
  });

  it("marks a fully booked day as full", () => {
    const bookings = [booking("10:00", 9 * 60, "2026-11-03")];
    const summary = summariseMonth({ month: "2026-11", settings, durationMinutes: 60, now: NOW, bookings, timeOff: [] });
    expect(summary.days.find((entry) => entry.date === "2026-11-03")!.status).toBe("full");
  });

  it("marks months beyond the window as unavailable", () => {
    const summary = summariseMonth({ month: "2027-02", settings, durationMinutes: 60, now: NOW, bookings: [], timeOff: [] });
    expect(summary.days.every((entry) => entry.status === "unavailable")).toBe(true);
  });
});

function addWeekBefore(date: string): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() - 7);
  return value.toISOString().slice(0, 10);
}
