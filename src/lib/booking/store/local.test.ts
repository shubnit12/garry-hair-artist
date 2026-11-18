import { randomUUID } from "node:crypto";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { computeDaySlots, type AvailabilityInput } from "../availability";
import { SlotTakenError } from "../errors";
import { addMinutes, zonedToUtc } from "../time";
import { createLocalStore } from "./local";
import type { BookingRecord, SlotVerifier } from "./types";

const settings: AvailabilityInput["settings"] = {
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  minNoticeMinutes: 0,
  maxAdvanceDays: 365,
  weeklyHours: (["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"] as const).map(
    (day) => ({ day, closed: false, open: "10:00", close: "19:00" }),
  ),
};
const NOW = zonedToUtc("2026-11-02", "08:00"); // Monday morning in Surrey
const DATE = "2026-11-10";

function draft(time: string, overrides: Partial<BookingRecord> = {}): BookingRecord {
  const start = zonedToUtc(DATE, time);
  return {
    id: randomUUID(),
    reference: "GH-TEST0",
    status: "confirmed",
    serviceSlug: "haircut",
    serviceName: "Haircut",
    durationMinutes: 60,
    date: DATE,
    time,
    start: start.toISOString(),
    end: addMinutes(start, 60).toISOString(),
    customerName: "Test Client",
    customerEmail: "client@example.com",
    customerPhone: "604 555 0100",
    notes: "",
    source: "website",
    createdAt: NOW.toISOString(),
    ...overrides,
  };
}

/** The same check the booking service runs inside the lock. */
const verifierFor =
  (time: string): SlotVerifier =>
  (snapshot) =>
    computeDaySlots({ date: DATE, settings, durationMinutes: 60, now: NOW, ...snapshot }).slots.find(
      (slot) => slot.time === time,
    )?.status === "available";

let dir: string;
let file: string;

beforeEach(async () => {
  dir = await mkdtemp(path.join(tmpdir(), "booking-store-"));
  file = path.join(dir, "nested", "bookings.json");
});

afterEach(async () => {
  await rm(dir, { recursive: true, force: true });
});

describe("local booking store", () => {
  it("lets exactly one of many concurrent requests book the same slot", async () => {
    const store = createLocalStore({ filePath: file });
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => store.createBooking(draft("14:00"), verifierFor("14:00"))),
    );

    const fulfilled = attempts.filter((result) => result.status === "fulfilled");
    const rejected = attempts.filter((result) => result.status === "rejected");
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(9);
    for (const result of rejected) expect(result.reason).toBeInstanceOf(SlotTakenError);

    const saved = JSON.parse(await readFile(file, "utf8")) as { bookings: unknown[] };
    expect(saved.bookings).toHaveLength(1);
  });

  it("serialises across store instances that share a file", async () => {
    const a = createLocalStore({ filePath: file });
    const b = createLocalStore({ filePath: file });
    const attempts = await Promise.allSettled([
      a.createBooking(draft("15:00"), verifierFor("15:00")),
      b.createBooking(draft("15:00"), verifierFor("15:00")),
      a.createBooking(draft("15:30"), verifierFor("15:30")), // overlaps the 15:00 appointment
    ]);
    expect(attempts.map((result) => result.status)).toEqual(["fulfilled", "rejected", "rejected"]);
  });

  it("accepts concurrent bookings for slots that do not conflict", async () => {
    const store = createLocalStore({ filePath: file });
    const times = ["10:00", "11:30", "13:00", "14:30"];
    const results = await Promise.all(times.map((time) => store.createBooking(draft(time), verifierFor(time))));
    expect(results.map((record) => record.time)).toEqual(times);
    expect(await store.listActiveBookings({ from: DATE, to: DATE })).toHaveLength(4);
    // Atomic writes leave no temp files behind.
    expect((await readdir(path.dirname(file))).filter((name) => name.endsWith(".tmp"))).toEqual([]);
  });

  it("reads bookings back and frees the slot once cancelled", async () => {
    const store = createLocalStore({ filePath: file });
    const created = await store.createBooking(draft("16:00"), verifierFor("16:00"));
    expect(created.notifiedStatus).toBe("confirmed");
    expect(await store.getBooking(created.id)).toMatchObject({ id: created.id, time: "16:00", status: "confirmed" });
    expect(await store.getBooking("missing")).toBeNull();

    const result = await store.updateBooking(created.id, (current) =>
      current.status === "confirmed" ? { status: "cancelled", cancelledBy: "client" } : null,
    );
    expect(result?.changed).toBe(true);
    expect(result?.after.status).toBe("cancelled");
    expect(await store.listActiveBookings({ from: DATE, to: DATE })).toEqual([]);

    // A second cancel is a no-op rather than a write.
    const again = await store.updateBooking(created.id, (current) =>
      current.status === "confirmed" ? { status: "cancelled" } : null,
    );
    expect(again?.changed).toBe(false);
    expect(await store.updateBooking("missing", () => ({ status: "cancelled" }))).toBeNull();

    await expect(store.createBooking(draft("16:00"), verifierFor("16:00"))).resolves.toMatchObject({
      time: "16:00",
    });
  });

  it("counts a client's upcoming active bookings by email address only", async () => {
    const store = createLocalStore({ filePath: file });
    const client = { email: "client@example.com", phone: "604 555 0100" };
    expect(await store.countUpcomingBookingsForClient(client, NOW)).toBe(0);

    await store.createBooking(draft("10:00"), verifierFor("10:00"));
    await store.createBooking(
      draft("12:00", { customerEmail: "Other@Example.com", customerPhone: "+1 (604) 555-0100" }),
      verifierFor("12:00"),
    );
    const cancelled = await store.createBooking(draft("14:00"), verifierFor("14:00"));
    await store.updateBooking(cancelled.id, () => ({ status: "cancelled" }));
    await store.createBooking(
      draft("16:00", { customerEmail: "someone@example.com", customerPhone: "778 555 0199" }),
      verifierFor("16:00"),
    );

    // Same email (10:00) counts; the same phone under another email (12:00), cancelled and other clients don't.
    expect(await store.countUpcomingBookingsForClient(client, NOW)).toBe(1);
    expect(await store.countUpcomingBookingsForClient({ email: "CLIENT@example.com ", phone: "" }, NOW)).toBe(1);
    // A known phone number alone reveals nothing.
    expect(await store.countUpcomingBookingsForClient({ email: "new@example.com", phone: "6045550100" }, NOW)).toBe(0);
    // Appointments that have started are no longer upcoming.
    expect(await store.countUpcomingBookingsForClient(client, zonedToUtc(DATE, "11:00"))).toBe(0);
  });

  it("reads hand-written time off from the file and applies it inside the lock", async () => {
    await writeFile(
      file.replace("nested/", ""),
      JSON.stringify({
        bookings: [],
        timeOff: [{ id: "lunch", startDate: DATE, allDay: false, startTime: "12:00", endTime: "13:00" }],
      }),
    );
    const store = createLocalStore({ filePath: file.replace("nested/", "") });
    expect(await store.listTimeOff({ from: DATE, to: DATE })).toEqual([
      { id: "lunch", startDate: DATE, endDate: DATE, allDay: false, startTime: "12:00", endTime: "13:00", reason: undefined },
    ]);
    expect(await store.listTimeOff({ from: "2026-11-11", to: "2026-11-30" })).toEqual([]);
    await expect(store.createBooking(draft("12:00"), verifierFor("12:00"))).rejects.toBeInstanceOf(SlotTakenError);
  });
});
