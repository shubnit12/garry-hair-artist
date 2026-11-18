import type { TimeOff } from "@/lib/content/types";

import type { BusyBooking } from "../availability";
import type { BookingStatus } from "../types";

/** A booking as stored (server-side only — contains personal data). */
export type BookingRecord = {
  id: string;
  reference: string;
  status: BookingStatus;
  /** Sanity id of the service document, when known. */
  serviceId?: string;
  serviceSlug: string;
  serviceName: string;
  durationMinutes: number;
  /** Source of truth: business-timezone date + time. */
  date: string;
  time: string;
  /** UTC copies derived from date + time + duration. */
  start: string;
  end: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  notes: string;
  source: "website" | "studio";
  createdAt?: string;
  cancelledAt?: string;
  cancelledBy?: "client" | "owner";
  /** Last status the client was emailed about. */
  notifiedStatus?: BookingStatus;
};

/** Fields a status transition may change. */
export type BookingPatch = Partial<
  Pick<BookingRecord, "status" | "cancelledAt" | "cancelledBy" | "notifiedStatus">
>;

export type BookingUpdateResult = {
  before: BookingRecord;
  after: BookingRecord;
  changed: boolean;
};

export type DateRange = { from: string; to: string };

/** Contact details a client booked with; their email recognises their other bookings. */
export type BookingClient = { email: string; phone: string };

/** Fresh view of a day, taken inside the booking lock. */
export type SlotSnapshot = { bookings: BusyBooking[]; timeOff: TimeOff[] };

/** Re-checks the requested slot against a fresh snapshot; false = taken. */
export type SlotVerifier = (snapshot: SlotSnapshot) => boolean;

export interface BookingStore {
  readonly kind: "sanity" | "local";
  /** Pending + confirmed bookings whose date is within the range (inclusive). */
  listActiveBookings(range: DateRange): Promise<BusyBooking[]>;
  /** Time off overlapping the range (inclusive). */
  listTimeOff(range: DateRange): Promise<TimeOff[]>;
  getBooking(id: string): Promise<BookingRecord | null>;
  /**
   * Pending + confirmed bookings starting after `now` for the same client:
   * same email address (any case).
   */
  countUpcomingBookingsForClient(client: BookingClient, now: Date): Promise<number>;
  /**
   * Creates the booking only if `verify` still accepts the slot, serialised
   * per date so two concurrent requests can never both succeed.
   * Throws `SlotTakenError` when the slot is gone.
   */
  createBooking(booking: BookingRecord, verify: SlotVerifier): Promise<BookingRecord>;
  /**
   * Applies `mutate(current)` atomically (optimistic concurrency). Returning
   * null from `mutate` leaves the booking untouched. Resolves null when the
   * booking does not exist.
   */
  updateBooking(
    id: string,
    mutate: (current: BookingRecord) => BookingPatch | null,
  ): Promise<BookingUpdateResult | null>;
}

export const ACTIVE_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];
