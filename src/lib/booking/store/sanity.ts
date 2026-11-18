import "server-only";

import { createHmac } from "node:crypto";

import type { SanityClient } from "next-sanity";

import { bookingSlug } from "@/lib/private-ids";

import type { BusyBooking } from "../availability";
import { BookingConflictError, SlotTakenError } from "../errors";
import { addDays, businessToday } from "../time";
import type { BookingStatus } from "../types";
import { countUpcomingForClient, toBookingRecord, toBusyBooking, toTimeOff } from "./normalize";
import {
  ACTIVE_BOOKINGS_QUERY,
  BOOKING_BY_ID_QUERY,
  CLIENT_BOOKINGS_QUERY,
  DAY_BOOKINGS_QUERY,
  TIME_OFF_QUERY,
} from "./queries";
import {
  ACTIVE_STATUSES,
  type BookingPatch,
  type BookingRecord,
  type BookingStore,
  type DateRange,
} from "./types";

/**
 * Booking store backed by the Sanity Content Lake.
 *
 * Reads use the uncached `liveClient`; writes use the token-bearing
 * `writeClient` with `visibility: "sync"` so the next read sees them.
 *
 * Double-booking protection: every website booking for a date commits in the
 * same transaction as an `ifRevisionId` patch on that date's lock document
 * (`dayLockId`). Two concurrent requests read the same
 * lock revision; the first commit changes it, so the second transaction is
 * rejected (409) and retried against fresh data — where the slot is now taken.
 *
 * The lock also records each website booking it admitted (`entries`). The
 * document endpoint is consistent with the lock revision, whereas the query
 * index can trail a just-committed booking for a moment, so recent entries
 * that queries do not show yet are still treated as busy.
 */

type Raw = Record<string, unknown>;

const MAX_ATTEMPTS = 3;
/** How long a lock entry may stand in for a booking the query index has not caught up with. */
const LOCK_ENTRY_TTL_MS = 10 * 60_000;

type LockEntry = { _key: string; time: string; durationMinutes: number; createdAt: string };
type LockDocument = { entries?: LockEntry[] };
type DayBooking = Raw & { id?: string; status?: string };

function definedOnly(patch: BookingPatch): BookingPatch {
  return Object.fromEntries(
    Object.entries(patch).filter(([, value]) => value !== undefined),
  ) as BookingPatch;
}

/** A revision mismatch (`ifRevisionId`) surfaces as an HTTP 409 ClientError. */
const isConflict = (error: unknown) => {
  const status = (error as { statusCode?: unknown } | null)?.statusCode;
  return status === 409 || status === 412;
};

/**
 * Busy appointments for the lock check: active bookings from the query, plus
 * recent lock entries the query does not include yet. Entries the query does
 * include are judged by the query (e.g. cancelled ones no longer block).
 */
export function busyFromLock(
  date: string,
  entries: LockEntry[] | undefined,
  dayBookings: DayBooking[],
  now = Date.now(),
): BusyBooking[] {
  const known = new Set(dayBookings.map((booking) => lockKey(booking.id ?? "")));
  const active = dayBookings
    .filter((booking) => ACTIVE_STATUSES.includes(booking.status as BookingStatus))
    .map(toBusyBooking)
    .filter((booking) => booking !== null);
  const pending = (entries ?? [])
    .filter((entry) => !known.has(entry._key) && now - Date.parse(entry.createdAt) < LOCK_ENTRY_TTL_MS)
    .map((entry) => toBusyBooking({ date, time: entry.time, durationMinutes: entry.durationMinutes }))
    .filter((booking) => booking !== null);
  return [...active, ...pending];
}

/**
 * The lock document for a date: `bookingDayLock.<keyed hash of the date>`.
 *
 * Private (dotted) like bookings, and the suffix is an HMAC rather than the
 * date itself: Sanity's document endpoint tells anyone whether an ID exists,
 * so `bookingDayLock.2026-12-01` would reveal which days have bookings.
 * Keyed with BOOKING_TOKEN_SECRET (domain-separated from the signed links),
 * never a built-in value; rotating it only starts fresh lock documents.
 */
export function dayLockId(date: string, secret: string): string {
  if (!secret) throw new Error("BOOKING_TOKEN_SECRET is not configured");
  const digest = createHmac("sha256", secret).update(`booking-day-lock:${date}`, "utf8").digest("hex");
  return `bookingDayLock.${digest.slice(0, 32)}`;
}

/** Lock entries are keyed by the booking's bare UUID, keeping array keys free of dots. */
const lockKey = (id: string) => bookingSlug(id);

/** 40–120 ms, then 80–240 ms … — spreads out retries from simultaneous requests. */
const backoff = (attempt: number) =>
  new Promise((resolve) => setTimeout(resolve, (40 + Math.random() * 80) * 2 ** attempt));

export function createSanityStore({
  readClient,
  writeClient,
  lockSecret,
}: {
  readClient: SanityClient;
  writeClient: SanityClient;
  /** BOOKING_TOKEN_SECRET; keys the day-lock IDs. */
  lockSecret: string;
}): BookingStore {
  if (!lockSecret) throw new Error("BOOKING_TOKEN_SECRET is not configured");
  const fetchOptions = { cache: "no-store" } as const;

  async function listActiveBookings({ from, to }: DateRange) {
    const raw = await readClient.fetch<Raw[]>(ACTIVE_BOOKINGS_QUERY, { from, to }, fetchOptions);
    return (raw ?? []).map(toBusyBooking).filter((booking) => booking !== null);
  }

  async function listTimeOff({ from, to }: DateRange) {
    const raw = await readClient.fetch<Raw[]>(TIME_OFF_QUERY, { from, to }, fetchOptions);
    return (raw ?? []).map(toTimeOff).filter((entry) => entry !== null);
  }

  async function fetchBooking(id: string) {
    const raw = await readClient.fetch<(Raw & { _rev?: string }) | null>(
      BOOKING_BY_ID_QUERY,
      { id },
      fetchOptions,
    );
    const record = toBookingRecord(raw);
    return record && raw?._rev ? { record, rev: raw._rev } : null;
  }

  function toDocument(booking: BookingRecord) {
    return {
      _id: booking.id,
      _type: "booking",
      status: booking.status,
      ...(booking.serviceId
        ? { service: { _type: "reference", _ref: booking.serviceId, _weak: true } }
        : {}),
      serviceName: booking.serviceName,
      serviceSlug: booking.serviceSlug,
      durationMinutes: booking.durationMinutes,
      date: booking.date,
      time: booking.time,
      start: booking.start,
      end: booking.end,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      customerPhone: booking.customerPhone,
      notes: booking.notes,
      reference: booking.reference,
      source: "website",
      createdAt: booking.createdAt,
      notifiedStatus: booking.notifiedStatus ?? booking.status,
    };
  }

  return {
    kind: "sanity",
    listActiveBookings,
    listTimeOff,

    async getBooking(id) {
      return (await fetchBooking(id))?.record ?? null;
    },

    async countUpcomingBookingsForClient(client, now) {
      // Phone numbers are stored as typed, so matching happens here rather than in GROQ.
      const raw = await readClient.fetch<Raw[]>(CLIENT_BOOKINGS_QUERY, { from: businessToday(now) }, fetchOptions);
      return countUpcomingForClient(raw ?? [], client, now);
    },

    async createBooking(booking, verify) {
      const lockId = dayLockId(booking.date, lockSecret);
      const entry: LockEntry = {
        _key: lockKey(booking.id),
        time: booking.time,
        durationMinutes: booking.durationMinutes,
        createdAt: new Date().toISOString(),
      };

      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        await writeClient.createIfNotExists(
          { _id: lockId, _type: "bookingDayLock", date: booking.date, version: 0 },
          { visibility: "sync" },
        );
        const lock = await writeClient.getDocument<LockDocument>(lockId);
        const rev = lock?._rev;
        if (!rev) throw new Error(`Booking lock ${lockId} could not be read`);

        const [dayBookings, timeOff] = await Promise.all([
          readClient.fetch<DayBooking[]>(
            DAY_BOOKINGS_QUERY,
            { from: addDays(booking.date, -1), to: booking.date },
            fetchOptions,
          ),
          listTimeOff({ from: booking.date, to: booking.date }),
        ]);
        const bookings = busyFromLock(booking.date, lock?.entries, dayBookings ?? []);
        if (!verify({ bookings, timeOff })) throw new SlotTakenError();

        try {
          await writeClient
            .transaction()
            .patch(lockId, (patch) =>
              patch
                .ifRevisionId(rev)
                .setIfMissing({ entries: [] })
                .append("entries", [entry])
                .inc({ version: 1 }),
            )
            .create(toDocument(booking))
            .commit({ visibility: "sync" });
          return { ...booking, source: "website", notifiedStatus: booking.notifiedStatus ?? booking.status };
        } catch (error) {
          if (!isConflict(error)) throw error;
          if (attempt < MAX_ATTEMPTS - 1) await backoff(attempt);
        }
      }
      throw new SlotTakenError("Gave up after repeated concurrent bookings for the same day");
    },

    async updateBooking(id, mutate) {
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
        const current = await fetchBooking(id);
        if (!current) return null;
        const patch = mutate(current.record);
        if (!patch) return { before: current.record, after: current.record, changed: false };

        const set = definedOnly(patch);
        try {
          await writeClient
            .patch(id)
            .ifRevisionId(current.rev)
            .set(set)
            .commit({ visibility: "sync" });
          return { before: current.record, after: { ...current.record, ...set }, changed: true };
        } catch (error) {
          if (!isConflict(error)) throw error;
          if (attempt < MAX_ATTEMPTS - 1) await backoff(attempt);
        }
      }
      throw new BookingConflictError();
    },
  };
}
