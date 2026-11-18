import "server-only";


import { getBookingSettings, getSiteSettings } from "@/lib/content/get";
import { newPrivateId } from "@/lib/private-ids";
import { isSuspiciouslyFast, rateLimit } from "@/lib/rate-limit";

import { bookingQueryRange, computeDaySlots, type AvailabilityInput } from "./availability";
import { requireBookableService } from "./availability-service";
import { BookingError, MESSAGES, SlotTakenError, describeError } from "./errors";
import { enforceRateLimit, isValidBookingId, requireStore, requireTokenSecret } from "./http";
import { notifyBookingCreated, notifyClientSelfCancelled } from "./notifications";
import { bookingIcs, icsFilename, toPublicBooking } from "./public";
import { generateReference } from "./reference";
import { bookingRequestSchema, cancelBookingSchema, fieldErrorsFrom } from "./schema";
import { getLiveBookingSettings } from "./settings";
import { ACTIVE_STATUSES, type BookingRecord } from "./store/types";
import { addMinutes, isValidDate, zonedToUtc } from "./time";
import { verifyBookingToken } from "./tokens";
import type { CreateBookingResponse, PublicBooking } from "./types";

/** Orchestration for the booking endpoints (create, view, cancel, calendar). */

export type ManagedBookingResponse = {
  booking: PublicBooking;
  canCancel: boolean;
  cancellationPolicy: string;
};

const PENDING_MESSAGE =
  "Thanks — your booking request has been received. Garry will confirm your appointment by email shortly.";
/** Used when the confirmation email failed: the editable message may promise an email. */
const CONFIRMED_NO_EMAIL_MESSAGE = "Your appointment is confirmed — see you in the chair.";
const PENDING_NO_EMAIL_MESSAGE =
  "Thanks — your booking request has been received. Garry will be in touch to confirm your appointment.";

/** Upcoming online bookings one email address may hold; more go through Garry. */
const MAX_UPCOMING_PER_CLIENT = 2;
/** Bookings per email address per day — every booking emails the address it was made with. */
const BOOKINGS_PER_EMAIL = { limit: 3, windowMs: 24 * 60 * 60_000 } as const;

const isActive = (record: BookingRecord) => ACTIVE_STATUSES.includes(record.status);
const isUpcoming = (record: BookingRecord, now: Date) => Date.parse(record.start) > now.getTime();

/** Status of `time` on `date` for a service, from a given snapshot. */
function slotStatus(input: AvailabilityInput & { date: string; time: string }) {
  const day = computeDaySlots(input);
  return day.closed ? undefined : day.slots.find((slot) => slot.time === input.time)?.status;
}

export async function createBooking(
  body: unknown,
  { ip, now }: { ip: string; now: Date },
): Promise<CreateBookingResponse> {
  // Honeypot first, so bots get a generic error rather than a field hint.
  const honeypot = (body as { website?: unknown } | null)?.website;
  if (typeof honeypot === "string" && honeypot.trim() !== "") {
    throw new BookingError(400, "VALIDATION", MESSAGES.generic);
  }

  const parsed = bookingRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw new BookingError(400, "VALIDATION", MESSAGES.validation, {
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const request = parsed.data;
  // A start time "in the future" means the visitor's clock runs ahead of ours: we can't judge it, so allow it.
  const clockAhead = request.startedAt !== undefined && request.startedAt > now.getTime();
  if (!clockAhead && isSuspiciouslyFast(request.startedAt)) {
    throw new BookingError(400, "VALIDATION", MESSAGES.tooFast);
  }
  if (!isValidDate(request.date)) {
    throw new BookingError(400, "VALIDATION", MESSAGES.validation, {
      fieldErrors: { date: ["Please choose a date"] },
    });
  }

  enforceRateLimit(`booking:${ip}`, 5, 10 * 60_000);

  const service = await requireBookableService(request.serviceSlug, 400);
  const store = requireStore();
  requireTokenSecret();

  // Re-check the slot against fresh data — never trust what the client saw.
  const settings = await getLiveBookingSettings();
  const base = { settings, durationMinutes: service.durationMinutes, now, date: request.date, time: request.time };
  const [bookings, timeOff] = await Promise.all([
    store.listActiveBookings(bookingQueryRange(request.date, request.date)),
    store.listTimeOff({ from: request.date, to: request.date }),
  ]);
  const status = slotStatus({ ...base, bookings, timeOff });
  if (!status) {
    throw new BookingError(400, "VALIDATION", MESSAGES.timeNotOffered, {
      fieldErrors: { time: [MESSAGES.timeNotOffered] },
    });
  }
  if (status !== "available") {
    // "booked" = someone else holds it; "unavailable" = it passed the notice cutoff, time off, etc.
    throw new BookingError(409, "SLOT_TAKEN", status === "booked" ? MESSAGES.slotTaken : MESSAGES.slotUnavailable);
  }

  // Per-client limits, so nobody can fill the calendar or send booking emails
  // to someone else's address in bulk. Checked last, so only requests that
  // would otherwise succeed count towards them.
  const client = { email: request.email, phone: request.phone };
  if ((await store.countUpcomingBookingsForClient(client, now)) >= MAX_UPCOMING_PER_CLIENT) {
    throw new BookingError(429, "RATE_LIMITED", MESSAGES.bookingLimit);
  }
  // Same status, body and headers (no Retry-After) as the cap above, so a
  // refusal doesn't say which limit fired.
  if (!rateLimit(`booking-email:${request.email}`, BOOKINGS_PER_EMAIL).ok) {
    throw new BookingError(429, "RATE_LIMITED", MESSAGES.bookingLimit);
  }

  const start = zonedToUtc(request.date, request.time);
  const bookingStatus = settings.autoConfirm ? "confirmed" : "pending";
  const draft: BookingRecord = {
    id: newPrivateId("booking"),
    reference: generateReference(),
    status: bookingStatus,
    serviceId: service.id,
    serviceSlug: service.slug,
    serviceName: service.name,
    durationMinutes: service.durationMinutes,
    date: request.date,
    time: request.time,
    start: start.toISOString(),
    end: addMinutes(start, service.durationMinutes).toISOString(),
    customerName: request.name,
    customerEmail: request.email,
    customerPhone: request.phone,
    notes: request.notes,
    source: "website",
    createdAt: now.toISOString(),
    notifiedStatus: bookingStatus,
  };

  let record: BookingRecord;
  try {
    record = await store.createBooking(draft, (snapshot) => slotStatus({ ...base, ...snapshot }) === "available");
  } catch (error) {
    if (error instanceof SlotTakenError) throw new BookingError(409, "SLOT_TAKEN", MESSAGES.slotTaken);
    throw error;
  }

  // The booking exists from here on: an email problem must never turn this into an error response.
  const emails = await notifyBookingCreated(record, {
    cancellationPolicy: settings.cancellationPolicy,
    now,
  }).catch((error: unknown) => {
    console.error(`[booking] Notifications failed for booking ${record.id}:`, describeError(error));
    return null;
  });

  const emailSent = emails?.client.ok ?? false;
  const confirmed = bookingStatus === "confirmed";
  return {
    booking: toPublicBooking(record),
    emailSent,
    message: emailSent
      ? confirmed
        ? settings.confirmationMessage
        : PENDING_MESSAGE
      : confirmed
        ? CONFIRMED_NO_EMAIL_MESSAGE
        : PENDING_NO_EMAIL_MESSAGE,
  };
}

/** Checks a signed link before touching the store (404 malformed id, 403 bad token). */
function authoriseSignedLink(id: string, token: string | null | undefined) {
  if (!isValidBookingId(id)) throw new BookingError(404, "NOT_FOUND", MESSAGES.bookingNotFound);
  const store = requireStore();
  requireTokenSecret();
  if (!verifyBookingToken(id, token)) throw new BookingError(403, "FORBIDDEN", MESSAGES.forbidden);
  return store;
}

async function loadSignedBooking(id: string, token: string | null | undefined): Promise<BookingRecord> {
  const record = await authoriseSignedLink(id, token).getBooking(id);
  if (!record) throw new BookingError(404, "NOT_FOUND", MESSAGES.bookingNotFound);
  return record;
}

export async function getManagedBooking(
  id: string,
  token: string | null,
  now: Date,
): Promise<ManagedBookingResponse> {
  const record = await loadSignedBooking(id, token);
  const settings = await getBookingSettings();
  return {
    booking: toPublicBooking(record),
    canCancel: isActive(record) && isUpcoming(record, now),
    cancellationPolicy: settings.cancellationPolicy,
  };
}

export async function cancelBookingByClient(
  id: string,
  body: unknown,
  { ip, now }: { ip: string; now: Date },
): Promise<{ booking: PublicBooking }> {
  const parsed = cancelBookingSchema.safeParse(body);
  if (!parsed.success) throw new BookingError(403, "FORBIDDEN", MESSAGES.forbidden);
  enforceRateLimit(`cancel:${ip}`, 10, 10 * 60_000);

  const store = authoriseSignedLink(id, parsed.data.token);
  const result = await store.updateBooking(id, (current) =>
    isActive(current) && isUpcoming(current, now)
      ? { status: "cancelled", cancelledAt: now.toISOString(), cancelledBy: "client", notifiedStatus: "cancelled" }
      : null,
  );
  if (!result) throw new BookingError(404, "NOT_FOUND", MESSAGES.bookingNotFound);
  if (!result.changed) {
    const current = result.before;
    const message =
      current.status === "cancelled"
        ? "This booking has already been cancelled."
        : isActive(current)
          ? "This appointment has already started, so it can't be cancelled online — please contact us."
          : "This booking can no longer be cancelled online — please contact us.";
    throw new BookingError(409, "VALIDATION", message);
  }

  await notifyClientSelfCancelled(result.after).catch((error: unknown) => {
    console.error(`[booking] Cancellation notifications failed for booking ${id}:`, describeError(error));
  });
  return { booking: toPublicBooking(result.after) };
}

export async function getBookingCalendar(
  id: string,
  token: string | null,
  now: Date,
): Promise<{ filename: string; ics: string }> {
  const record = await loadSignedBooking(id, token);
  const site = await getSiteSettings();
  return { filename: icsFilename(record.reference), ics: bookingIcs(record, site, now) };
}
