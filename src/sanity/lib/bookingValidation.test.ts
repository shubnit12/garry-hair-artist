import type { ValidationContext } from "sanity";
import { describe, expect, it } from "vitest";

import { bookingDateWarning, bookingDurationWarning, bookingTimeWarning } from "./bookingValidation";

type DayContext = {
  others: {
    id: string;
    time: string;
    durationMinutes: number;
    customerName?: string;
    serviceName?: string;
  }[];
  serviceName?: string | null;
  serviceDuration: number | null;
  settings: { bufferMinutes?: number; weeklyHours?: unknown[] } | null;
  timeOff: {
    _id: string;
    reason?: string;
    startDate: string;
    endDate?: string;
    allDay?: boolean;
    startTime?: string;
    endTime?: string;
  }[];
};

let documentCounter = 0;

/** A validation context whose client answers the day query with `day`. */
function contextFor(document: Record<string, unknown>, day: Partial<DayContext>): ValidationContext {
  const response: DayContext = { others: [], serviceDuration: 60, settings: null, timeOff: [], ...day };
  return {
    // A unique id per test keeps the short-lived request cache from leaking between tests.
    document: { _id: `booking-${++documentCounter}`, _type: "booking", ...document },
    getClient: () => ({ fetch: async () => response }),
    environment: "studio",
  } as unknown as ValidationContext;
}

const tuesday = "2026-11-03";
const monday = "2026-11-02";

describe("bookingTimeWarning", () => {
  it("passes a free slot", async () => {
    const context = contextFor({ status: "confirmed", date: tuesday, time: "14:00" }, {});
    expect(await bookingTimeWarning("14:00", context)).toBe(true);
  });

  it("warns about an overlapping booking", async () => {
    const context = contextFor(
      { status: "confirmed", date: tuesday, time: "14:30" },
      {
        others: [
          { id: "b", time: "14:00", durationMinutes: 60, customerName: "Sam", serviceName: "Haircut" },
        ],
      },
    );
    expect(await bookingTimeWarning("14:30", context)).toBe("Overlaps with Sam (Haircut, 2:00 – 3:00 PM).");
  });

  it("warns when the buffer is not respected", async () => {
    const context = contextFor(
      { status: "pending", date: tuesday, time: "15:00", durationMinutes: 30 },
      { others: [{ id: "b", time: "14:00", durationMinutes: 60 }], settings: { bufferMinutes: 15 } },
    );
    expect(await bookingTimeWarning("15:00", context)).toMatch(/less than your 15-minute buffer/);
  });

  it("warns when the appointment runs past closing time", async () => {
    const context = contextFor(
      { status: "confirmed", date: tuesday, time: "18:30" },
      { serviceDuration: 90 },
    );
    expect(await bookingTimeWarning("18:30", context)).toMatch(/after closing time \(7:00 PM\)/);
  });

  it("warns about partial time off", async () => {
    const context = contextFor(
      { status: "confirmed", date: tuesday, time: "12:00" },
      {
        timeOff: [
          {
            _id: "t",
            reason: "Lunch",
            startDate: tuesday,
            allDay: false,
            startTime: "12:00",
            endTime: "13:00",
          },
        ],
      },
    );
    expect(await bookingTimeWarning("12:00", context)).toMatch(/time off \(Lunch\)/);
  });

  it("ignores cancelled bookings", async () => {
    const context = contextFor(
      { status: "cancelled", date: tuesday, time: "14:30" },
      { others: [{ id: "b", time: "14:00", durationMinutes: 60 }] },
    );
    expect(await bookingTimeWarning("14:30", context)).toBe(true);
  });

  it("never blocks editing when the lookup fails", async () => {
    const context = {
      document: { _id: "booking-offline", status: "confirmed", date: tuesday },
      getClient: () => ({ fetch: async () => Promise.reject(new Error("offline")) }),
    } as unknown as ValidationContext;
    expect(await bookingTimeWarning("14:00", context)).toBe(true);
  });
});

describe("bookingDateWarning", () => {
  it("warns about closed weekdays (default hours close Mondays)", async () => {
    const context = contextFor({ status: "confirmed", time: "11:00" }, {});
    expect(await bookingDateWarning(monday, context)).toMatch(/^Mondays are closed/);
  });

  it("warns about all-day time off", async () => {
    const context = contextFor(
      { status: "confirmed", time: "11:00" },
      { timeOff: [{ _id: "t", reason: "Holiday", startDate: "2026-11-01", endDate: "2026-11-05" }] },
    );
    expect(await bookingDateWarning(tuesday, context)).toBe("This date is blocked as time off (Holiday).");
  });

  it("passes an open day", async () => {
    const context = contextFor({ status: "confirmed", time: "11:00" }, {});
    expect(await bookingDateWarning(tuesday, context)).toBe(true);
  });

  it("treats partial time off with inverted times as all day, like the website", async () => {
    const context = contextFor(
      { status: "confirmed", time: "11:00" },
      {
        timeOff: [
          { _id: "t", reason: "Typo", startDate: tuesday, allDay: false, startTime: "14:00", endTime: "13:00" },
        ],
      },
    );
    expect(await bookingDateWarning(tuesday, context)).toBe("This date is blocked as time off (Typo).");
  });

  it("treats a booking without a status as active (confirmed)", async () => {
    const context = contextFor({ time: "11:00" }, {});
    expect(await bookingDateWarning(monday, context)).toMatch(/^Mondays are closed/);
  });
});

describe("bookingDurationWarning", () => {
  const service = { _type: "reference", _ref: "service-colour" };

  it("asks for a duration when the booking has none of its own", async () => {
    const context = contextFor({ status: "confirmed", date: tuesday, service }, {});
    expect(await bookingDurationWarning(undefined, context)).toMatch(/^Enter how long this appointment takes/);
  });

  it("warns when the duration differs from the selected service's", async () => {
    const context = contextFor(
      { status: "confirmed", date: tuesday, service, durationMinutes: 60 },
      { serviceName: "Colouring", serviceDuration: 150 },
    );
    expect(await bookingDurationWarning(60, context)).toBe(
      "Colouring takes 150 min, but this booking is 60 min. If the service changed, update the duration to match.",
    );
  });

  it("passes a matching duration, bookings without a service and inactive bookings", async () => {
    const matching = contextFor({ status: "confirmed", date: tuesday, service }, { serviceDuration: 150 });
    expect(await bookingDurationWarning(150, matching)).toBe(true);
    const noService = contextFor({ status: "confirmed", date: tuesday }, {});
    expect(await bookingDurationWarning(undefined, noService)).toBe(true);
    const cancelled = contextFor({ status: "cancelled", date: tuesday, service }, {});
    expect(await bookingDurationWarning(undefined, cancelled)).toBe(true);
  });
});
