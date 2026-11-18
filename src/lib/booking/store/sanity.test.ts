import { randomUUID } from "node:crypto";

import type { SanityClient } from "next-sanity";
import { describe, expect, it } from "vitest";

import { computeDaySlots, type AvailabilityInput } from "../availability";
import { BookingConflictError, SlotTakenError } from "../errors";
import { addMinutes, zonedToUtc } from "../time";
import {
  ACTIVE_BOOKINGS_QUERY,
  BOOKING_BY_ID_QUERY,
  CLIENT_BOOKINGS_QUERY,
  DAY_BOOKINGS_QUERY,
  TIME_OFF_QUERY,
} from "./queries";
import { busyFromLock, createSanityStore, dayLockId } from "./sanity";
import type { BookingRecord, SlotVerifier } from "./types";

/**
 * In-memory stand-in for the Content Lake that enforces `ifRevisionId` the way
 * the real API does (409 on mismatch, transactions all-or-nothing) and yields
 * between every call so concurrent requests interleave.
 */
type Doc = Record<string, unknown> & { _id: string; _type: string; _rev: string };

class ConflictError extends Error {
  statusCode = 409;
}

function createFakeLake(options: { alwaysConflict?: boolean; indexLagMs?: number } = {}) {
  const docs = new Map<string, Doc>();
  /** When each document became visible to queries (simulated index lag). */
  const indexedAt = new Map<string, number>();
  let revision = 0;
  const tick = () => new Promise((resolve) => setTimeout(resolve, Math.random() * 3));
  const nextRev = () => `rev-${++revision}`;

  type Op = {
    ifRevisionId?: string;
    inc?: Record<string, number>;
    set?: Record<string, unknown>;
    setIfMissing?: Record<string, unknown>;
    append?: { path: string; items: unknown[] };
  };
  class FakePatch {
    op: Op = {};
    constructor(readonly id: string) {}
    ifRevisionId(rev: string) {
      this.op.ifRevisionId = rev;
      return this;
    }
    inc(attrs: Record<string, number>) {
      this.op.inc = attrs;
      return this;
    }
    set(attrs: Record<string, unknown>) {
      this.op.set = attrs;
      return this;
    }
    setIfMissing(attrs: Record<string, unknown>) {
      this.op.setIfMissing = attrs;
      return this;
    }
    append(path: string, items: unknown[]) {
      this.op.append = { path, items };
      return this;
    }
    async commit() {
      await tick();
      apply([{ patch: this }]);
    }
  }

  function apply(mutations: ({ patch: FakePatch } | { create: Record<string, unknown> })[]) {
    if (options.alwaysConflict) throw new ConflictError("forced conflict");
    for (const mutation of mutations) {
      if ("patch" in mutation) {
        const current = docs.get(mutation.patch.id);
        if (!current) throw new Error("missing document");
        const expected = mutation.patch.op.ifRevisionId;
        if (expected && expected !== current._rev) throw new ConflictError("unexpected revision");
      } else if (docs.has(String(mutation.create._id))) {
        throw new ConflictError("document exists");
      }
    }
    for (const mutation of mutations) {
      if ("patch" in mutation) {
        const { op } = mutation.patch;
        const current = docs.get(mutation.patch.id)!;
        const next: Doc = { ...current, ...op.set, _rev: nextRev() };
        for (const [key, value] of Object.entries(op.setIfMissing ?? {})) if (next[key] === undefined) next[key] = value;
        for (const [key, by] of Object.entries(op.inc ?? {})) next[key] = Number(next[key] ?? 0) + by;
        if (op.append) next[op.append.path] = [...((next[op.append.path] as unknown[]) ?? []), ...op.append.items];
        docs.set(current._id, next);
      } else {
        const doc = { ...mutation.create, _rev: nextRev() } as Doc;
        docs.set(doc._id, doc);
        indexedAt.set(doc._id, Date.now() + (options.indexLagMs ?? 0));
      }
    }
  }

  const client = {
    async createIfNotExists(doc: Record<string, unknown> & { _id: string; _type: string }) {
      await tick();
      if (!docs.has(doc._id)) docs.set(doc._id, { ...doc, _rev: nextRev() });
      return docs.get(doc._id);
    },
    async getDocument(id: string) {
      await tick();
      return docs.get(id);
    },
    async fetch(query: string, params: Record<string, string>) {
      await tick();
      // Queries only see documents the (simulated) index has caught up with.
      const all = [...docs.values()].filter((d) => (indexedAt.get(d._id) ?? 0) <= Date.now());
      const onDates = (d: Doc) =>
        d._type === "booking" && String(d.date) >= params.from! && String(d.date) <= params.to!;
      if (query === ACTIVE_BOOKINGS_QUERY) {
        return all
          .filter((d) => onDates(d) && ["pending", "confirmed"].includes(String(d.status ?? "confirmed")))
          .map((d) => ({ date: d.date, time: d.time, durationMinutes: d.durationMinutes ?? 60 }));
      }
      if (query === DAY_BOOKINGS_QUERY) {
        return all.filter(onDates).map((d) => ({
          id: d._id,
          status: d.status ?? "confirmed",
          date: d.date,
          time: d.time,
          durationMinutes: d.durationMinutes ?? 60,
        }));
      }
      if (query === CLIENT_BOOKINGS_QUERY) {
        return all
          .filter(
            (d) =>
              d._type === "booking" &&
              String(d.date) >= params.from! &&
              ["pending", "confirmed"].includes(String(d.status ?? "confirmed")),
          )
          .map((d) => ({ date: d.date, time: d.time, customerEmail: d.customerEmail, customerPhone: d.customerPhone }));
      }
      if (query === TIME_OFF_QUERY) return [];
      if (query === BOOKING_BY_ID_QUERY) {
        const doc = docs.get(params.id!);
        return doc && doc._type === "booking" ? { ...doc, id: doc._id } : null;
      }
      throw new Error("unexpected query");
    },
    transaction() {
      const mutations: ({ patch: FakePatch } | { create: Record<string, unknown> })[] = [];
      const transaction = {
        patch(id: string, build: (patch: FakePatch) => FakePatch) {
          mutations.push({ patch: build(new FakePatch(id)) });
          return transaction;
        },
        create(doc: Record<string, unknown>) {
          mutations.push({ create: doc });
          return transaction;
        },
        async commit() {
          await tick();
          apply(mutations);
        },
      };
      return transaction;
    },
    patch(id: string) {
      return new FakePatch(id);
    },
  };

  return { client: client as unknown as SanityClient, docs };
}

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
const LOCK_SECRET = "test-lock-secret";

function draft(time: string, overrides: Partial<BookingRecord> = {}): BookingRecord {
  const start = zonedToUtc(DATE, time);
  return {
    id: `booking.${randomUUID()}`,
    reference: "GH-TEST0",
    status: "pending",
    serviceId: "service-haircut",
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

const verifierFor =
  (time: string): SlotVerifier =>
  (snapshot) =>
    computeDaySlots({ date: DATE, settings, durationMinutes: 60, now: NOW, ...snapshot }).slots.find(
      (slot) => slot.time === time,
    )?.status === "available";

describe("sanity booking store", () => {
  it("lets exactly one of many concurrent requests book the same slot", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => store.createBooking(draft("14:00"), verifierFor("14:00"))),
    );

    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    for (const result of attempts.filter((r) => r.status === "rejected")) {
      expect((result as PromiseRejectedResult).reason).toBeInstanceOf(SlotTakenError);
    }
    const bookings = [...lake.docs.values()].filter((doc) => doc._type === "booking");
    expect(bookings).toHaveLength(1);
    expect(lake.docs.get(dayLockId(DATE, LOCK_SECRET))).toMatchObject({ _type: "bookingDayLock", date: DATE, version: 1 });
  });

  it("stays correct while the query index lags behind committed bookings", async () => {
    const lake = createFakeLake({ indexLagMs: 60_000 });
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const attempts = await Promise.allSettled(
      Array.from({ length: 10 }, () => store.createBooking(draft("14:00"), verifierFor("14:00"))),
    );
    expect(attempts.filter((result) => result.status === "fulfilled")).toHaveLength(1);
    // A later, overlapping request is still refused although queries cannot see the booking yet.
    await expect(store.createBooking(draft("14:30"), verifierFor("14:30"))).rejects.toBeInstanceOf(SlotTakenError);
    expect(lake.docs.get(dayLockId(DATE, LOCK_SECRET))?.entries).toHaveLength(1);
  });

  it("saves bookings under their private id and keys lock entries by the bare UUID", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const booking = draft("10:00");
    await store.createBooking(booking, verifierFor("10:00"));
    expect(lake.docs.get(booking.id)).toMatchObject({ _id: booking.id, _type: "booking" });
    const entries = lake.docs.get(dayLockId(DATE, LOCK_SECRET))?.entries as { _key: string }[];
    expect(entries.map((entry) => entry._key)).toEqual([booking.id.slice("booking.".length)]);
  });

  it("retries after a lock conflict so non-overlapping bookings both succeed", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const results = await Promise.all([
      store.createBooking(draft("10:00"), verifierFor("10:00")),
      store.createBooking(draft("16:00"), verifierFor("16:00")),
    ]);
    expect(results.map((record) => record.time).sort()).toEqual(["10:00", "16:00"]);
    expect(lake.docs.get(dayLockId(DATE, LOCK_SECRET))?.version).toBe(2);
  });

  it("writes the booking document in the Studio schema's shape", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const created = await store.createBooking(draft("12:00"), verifierFor("12:00"));
    expect(lake.docs.get(created.id)).toMatchObject({
      _type: "booking",
      status: "pending",
      service: { _type: "reference", _ref: "service-haircut", _weak: true },
      serviceName: "Haircut",
      serviceSlug: "haircut",
      durationMinutes: 60,
      date: DATE,
      time: "12:00",
      start: created.start,
      end: created.end,
      reference: "GH-TEST0",
      source: "website",
      notifiedStatus: "pending",
    });
    expect(await store.getBooking(created.id)).toMatchObject({ id: created.id, status: "pending", time: "12:00" });
  });

  it("counts a client's upcoming active bookings by email address only", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const client = { email: "client@example.com", phone: "604-555-0100" };

    await store.createBooking(draft("10:00"), verifierFor("10:00"));
    await store.createBooking(
      draft("12:00", { customerEmail: "other@example.com", customerPhone: "1 604 555 0100" }),
      verifierFor("12:00"),
    );
    const cancelled = await store.createBooking(draft("14:00"), verifierFor("14:00"));
    await store.updateBooking(cancelled.id, () => ({ status: "cancelled" }));
    await store.createBooking(
      draft("16:00", { customerEmail: "someone@example.com", customerPhone: "778 555 0199" }),
      verifierFor("16:00"),
    );
    // A booking Garry entered in the Studio, with a mixed-case address.
    lake.docs.set("studio-booking", {
      _id: "studio-booking",
      _type: "booking",
      _rev: "rev-studio",
      date: "2026-11-11",
      time: "10:00",
      customerEmail: "Client@Example.com",
    });

    // 10:00 + the Studio booking; the same phone under another email (12:00) doesn't count.
    expect(await store.countUpcomingBookingsForClient(client, NOW)).toBe(2);
    expect(await store.countUpcomingBookingsForClient({ email: "new@example.com", phone: "604-555-0100" }, NOW)).toBe(0);
    expect(await store.countUpcomingBookingsForClient(client, zonedToUtc(DATE, "11:00"))).toBe(1);
  });

  it("gives up with SlotTakenError when every commit conflicts", async () => {
    const lake = createFakeLake({ alwaysConflict: true });
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    await expect(store.createBooking(draft("11:00"), verifierFor("11:00"))).rejects.toBeInstanceOf(SlotTakenError);
  });

  it("applies status updates with optimistic concurrency", async () => {
    const lake = createFakeLake();
    const store = createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: LOCK_SECRET });
    const created = await store.createBooking(draft("15:00"), verifierFor("15:00"));

    const cancel = (current: BookingRecord) =>
      current.status === "pending" ? ({ status: "cancelled", cancelledBy: "client" } as const) : null;
    const [first, second] = await Promise.all([
      store.updateBooking(created.id, cancel),
      store.updateBooking(created.id, cancel),
    ]);
    expect([first?.changed, second?.changed].sort()).toEqual([false, true]);
    expect(lake.docs.get(created.id)).toMatchObject({ status: "cancelled", cancelledBy: "client" });
    expect(await store.updateBooking("missing", cancel)).toBeNull();

    const conflicted = createSanityStore({
      readClient: lake.client,
      writeClient: createFakeLake({ alwaysConflict: true }).client,
      lockSecret: LOCK_SECRET,
    });
    await expect(conflicted.updateBooking(created.id, () => ({ notifiedStatus: "cancelled" }))).rejects.toBeInstanceOf(
      BookingConflictError,
    );
  });
});

describe("dayLockId", () => {
  it("is private, stable per date and doesn't reveal the date", () => {
    const id = dayLockId(DATE, "secret-a");
    expect(id).toMatch(/^bookingDayLock\.[0-9a-f]{32}$/);
    expect(id).not.toContain(DATE);
    expect(id).not.toContain(DATE.replaceAll("-", ""));
    expect(dayLockId(DATE, "secret-a")).toBe(id);
    expect(dayLockId("2026-11-11", "secret-a")).not.toBe(id);
    expect(dayLockId(DATE, "secret-b")).not.toBe(id);
  });

  it("refuses to run without a secret", () => {
    expect(() => dayLockId(DATE, "")).toThrow(/BOOKING_TOKEN_SECRET/);
    const lake = createFakeLake();
    expect(() => createSanityStore({ readClient: lake.client, writeClient: lake.client, lockSecret: "" })).toThrow(
      /BOOKING_TOKEN_SECRET/,
    );
  });
});

describe("busyFromLock", () => {
  const now = Date.parse("2026-11-02T16:00:00Z");
  const entry = (key: string, time: string, minutesAgo: number) => ({
    _key: key,
    time,
    durationMinutes: 60,
    createdAt: new Date(now - minutesAgo * 60_000).toISOString(),
  });

  it("merges active bookings with recent entries the index has not caught up with", () => {
    const busy = busyFromLock(
      DATE,
      [entry("new", "15:00", 1), entry("old", "17:00", 30), entry("known", "11:00", 1)],
      [
        { id: "booking.known", status: "cancelled", date: DATE, time: "11:00", durationMinutes: 60 },
        { id: "other", status: "confirmed", date: DATE, time: "12:00", durationMinutes: 90 },
        { id: "done", status: "completed", date: DATE, time: "13:00", durationMinutes: 60 },
      ],
      now,
    );
    expect(busy).toEqual([
      { date: DATE, time: "12:00", durationMinutes: 90 },
      { date: DATE, time: "15:00", durationMinutes: 60 },
    ]);
  });
});
