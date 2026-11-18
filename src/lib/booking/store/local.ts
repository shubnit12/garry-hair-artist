import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import { SlotTakenError } from "../errors";
import { addDays } from "../time";
import { countUpcomingForClient, toBookingRecord, toBusyBooking, toTimeOff } from "./normalize";
import { ACTIVE_STATUSES, type BookingRecord, type BookingStore } from "./types";

/**
 * JSON-file booking store for local development and testing ONLY
 * (`.data/bookings.json`). Serverless file systems are ephemeral and
 * per-instance, so never rely on this in production.
 *
 * Writes are serialised by an in-process mutex and written atomically
 * (temp file + rename), which gives the same "one winner per slot" guarantee
 * as the Sanity store within a single server process. Time off can be tested
 * by adding entries to the file's `timeOff` array by hand.
 */

type FileShape = { bookings: unknown[]; timeOff: unknown[] };

export const DEFAULT_LOCAL_STORE_PATH = path.join(process.cwd(), ".data", "bookings.json");

/** One promise chain per file, shared by every store instance in the process. */
const queues = new Map<string, Promise<void>>();

async function withFileLock<T>(file: string, task: () => Promise<T>): Promise<T> {
  const previous = queues.get(file) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tail = previous.then(() => current);
  queues.set(file, tail);
  await previous;
  try {
    return await task();
  } finally {
    release();
    if (queues.get(file) === tail) queues.delete(file);
  }
}

async function readData(file: string): Promise<FileShape> {
  let text: string;
  try {
    text = await readFile(file, "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { bookings: [], timeOff: [] };
    throw error;
  }
  const parsed = JSON.parse(text) as Partial<FileShape> | null;
  return {
    bookings: Array.isArray(parsed?.bookings) ? parsed.bookings : [],
    timeOff: Array.isArray(parsed?.timeOff) ? parsed.timeOff : [],
  };
}

async function writeData(file: string, data: FileShape): Promise<void> {
  await mkdir(path.dirname(file), { recursive: true });
  const temp = `${file}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await writeFile(temp, `${JSON.stringify(data, null, 2)}\n`, "utf8");
    await rename(temp, file);
  } catch (error) {
    await rm(temp, { force: true });
    throw error;
  }
}

const records = (data: FileShape) =>
  data.bookings
    .map((raw) => toBookingRecord(raw as Record<string, unknown>))
    .filter((record) => record !== null);

const activeBetween = (data: FileShape, from: string, to: string) =>
  records(data)
    .filter((b) => ACTIVE_STATUSES.includes(b.status) && b.date >= from && b.date <= to)
    .map((b) => toBusyBooking(b))
    .filter((b) => b !== null);

const timeOffBetween = (data: FileShape, from: string, to: string) =>
  data.timeOff
    .map((raw) => toTimeOff(raw as Record<string, unknown>))
    .filter((entry) => entry !== null)
    .filter((entry) => entry.startDate <= to && entry.endDate >= from);

export function createLocalStore({ filePath = DEFAULT_LOCAL_STORE_PATH } = {}): BookingStore {
  // Dev/test only — keep the bundler from tracing the whole project for this path.
  const file = path.resolve(/*turbopackIgnore: true*/ filePath);

  return {
    kind: "local",

    async listActiveBookings({ from, to }) {
      return activeBetween(await readData(file), from, to);
    },

    async listTimeOff({ from, to }) {
      return timeOffBetween(await readData(file), from, to);
    },

    async getBooking(id) {
      const data = await readData(file);
      return records(data).find((b) => b.id === id) ?? null;
    },

    async countUpcomingBookingsForClient(client, now) {
      const active = records(await readData(file)).filter((b) => ACTIVE_STATUSES.includes(b.status));
      return countUpcomingForClient(active, client, now);
    },

    async createBooking(booking, verify) {
      return withFileLock(file, async () => {
        const data = await readData(file);
        const snapshot = {
          bookings: activeBetween(data, addDays(booking.date, -1), booking.date),
          timeOff: timeOffBetween(data, booking.date, booking.date),
        };
        if (!verify(snapshot)) throw new SlotTakenError();

        const stored: BookingRecord = {
          ...booking,
          source: "website",
          notifiedStatus: booking.notifiedStatus ?? booking.status,
        };
        await writeData(file, { ...data, bookings: [...data.bookings, stored] });
        return stored;
      });
    },

    async updateBooking(id, mutate) {
      return withFileLock(file, async () => {
        const data = await readData(file);
        const index = data.bookings.findIndex(
          (raw) => (raw as { id?: unknown } | null)?.id === id,
        );
        const before = index >= 0 ? toBookingRecord(data.bookings[index] as Record<string, unknown>) : null;
        if (!before) return null;

        const patch = mutate(before);
        if (!patch) return { before, after: before, changed: false };

        const after: BookingRecord = { ...before };
        for (const [key, value] of Object.entries(patch)) {
          if (value !== undefined) Object.assign(after, { [key]: value });
        }
        const bookings = [...data.bookings];
        bookings[index] = after;
        await writeData(file, { ...data, bookings });
        return { before, after, changed: true };
      });
    },
  };
}
