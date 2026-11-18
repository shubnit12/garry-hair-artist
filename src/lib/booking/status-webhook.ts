import "server-only";

import { z } from "zod";

import { BookingError } from "./errors";
import { isValidBookingId, requireStore, requireTokenSecret } from "./http";
import { notifyClientConfirmed, notifyOwnerCancelled } from "./notifications";
import type { BookingRecord } from "./store/types";

/**
 * Reacts to a booking status change made in the Studio (Sanity webhook):
 *  - cancelled by Garry  → "your appointment has been cancelled" email
 *  - pending → confirmed → "your appointment is confirmed" email (+ .ics)
 * `notifiedStatus` records what the client was last told, so repeated or
 * unrelated deliveries never send duplicates.
 */

export type StatusWebhookResult = {
  action: "client-cancelled-email" | "client-confirmed-email" | "none";
  reason?: string;
};

const emailSchema = z.email();

const none = (reason: string): StatusWebhookResult => ({ action: "none", reason });

function skipReason(record: BookingRecord, now: Date): string | null {
  if (!emailSchema.safeParse(record.customerEmail).success) return "no-client-email";
  if (Date.parse(record.start) <= now.getTime()) return "appointment-in-past";
  return null;
}

export async function processBookingStatusChange(id: string, now: Date): Promise<StatusWebhookResult> {
  if (!isValidBookingId(id)) return none("not-a-published-booking");
  const store = requireStore();
  const record = await store.getBooking(id);
  if (!record) return none("not-found");

  if (record.status === "cancelled" && record.notifiedStatus !== "cancelled" && record.cancelledBy !== "client") {
    const skip = skipReason(record, now);
    if (skip) return none(skip);

    const sent = await notifyOwnerCancelled(record);
    // A failed email should be retried by Sanity, so surface it as an error.
    if (!sent.ok) throw new BookingError(502, "SERVER", "Client email could not be sent");
    await store.updateBooking(id, (current) =>
      current.status === "cancelled" && current.notifiedStatus !== "cancelled"
        ? {
            notifiedStatus: "cancelled",
            cancelledBy: "owner",
            cancelledAt: current.cancelledAt ?? now.toISOString(),
          }
        : null,
    );
    return { action: "client-cancelled-email" };
  }

  if (record.status === "confirmed" && record.notifiedStatus === "pending") {
    const skip = skipReason(record, now);
    if (skip) return none(skip);
    requireTokenSecret(); // the email carries signed manage + calendar links

    const sent = await notifyClientConfirmed(record);
    if (!sent.ok) throw new BookingError(502, "SERVER", "Client email could not be sent");
    await store.updateBooking(id, (current) =>
      current.status === "confirmed" && current.notifiedStatus === "pending"
        ? { notifiedStatus: "confirmed" }
        : null,
    );
    return { action: "client-confirmed-email" };
  }

  return none("no-notification-needed");
}
