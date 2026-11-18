import "server-only";

import { BUSINESS_TIMEZONE } from "@/lib/site";

import { bookingQueryRange, bookingWindow, computeDaySlots, summariseMonth } from "./availability";
import { BookingError, MESSAGES } from "./errors";
import { requireStore } from "./http";
import { availabilityQuerySchema, fieldErrorsFrom, monthAvailabilityQuerySchema } from "./schema";
import { getLiveBookingSettings, getLiveService, type BookableService } from "./settings";
import { datesInMonth, isValidDate } from "./time";
import type { AvailabilityResponse, MonthAvailabilityResponse } from "./types";

/** Orchestration for GET /api/availability and /api/availability/month. */

function invalidQuery(fieldErrors: Record<string, string[]>): BookingError {
  return new BookingError(400, "VALIDATION", "Please choose a service and a valid date.", { fieldErrors });
}

/**
 * Bookable service by slug, read live from the CMS, or a BookingError with the
 * given status (503 when Sanity is connected but cannot be read).
 */
export async function requireBookableService(slug: string, status: 404 | 400): Promise<BookableService> {
  const service = await getLiveService(slug);
  if (service?.bookable) return service;
  throw status === 404
    ? new BookingError(404, "NOT_FOUND", MESSAGES.serviceNotFound)
    : new BookingError(400, "VALIDATION", MESSAGES.serviceNotFound, {
        fieldErrors: { serviceSlug: ["This service can't be booked online — please choose another."] },
      });
}

const serviceSummary = (service: BookableService) => ({
  slug: service.slug,
  name: service.name,
  durationMinutes: service.durationMinutes,
});

export async function getDayAvailability(
  query: { service: string | null; date: string | null },
  now: Date,
): Promise<AvailabilityResponse> {
  const parsed = availabilityQuerySchema.safeParse(query);
  if (!parsed.success) throw invalidQuery(fieldErrorsFrom(parsed.error));
  const { date } = parsed.data;
  if (!isValidDate(date)) throw invalidQuery({ date: ["Please choose a valid date."] });

  const service = await requireBookableService(parsed.data.service, 404);
  const store = requireStore();
  const settings = await getLiveBookingSettings();
  const [bookings, timeOff] = await Promise.all([
    store.listActiveBookings(bookingQueryRange(date, date)),
    store.listTimeOff({ from: date, to: date }),
  ]);
  const day = computeDaySlots({
    date,
    durationMinutes: service.durationMinutes,
    settings,
    bookings,
    timeOff,
    now,
  });

  return {
    date,
    timezone: BUSINESS_TIMEZONE,
    service: serviceSummary(service),
    closed: day.closed,
    slots: day.slots,
  };
}

export async function getMonthAvailability(
  query: { service: string | null; month: string | null },
  now: Date,
): Promise<MonthAvailabilityResponse> {
  const parsed = monthAvailabilityQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new BookingError(400, "VALIDATION", "Please choose a service and a valid month.", {
      fieldErrors: fieldErrorsFrom(parsed.error),
    });
  }
  const { month } = parsed.data;

  const service = await requireBookableService(parsed.data.service, 404);
  const store = requireStore();
  const settings = await getLiveBookingSettings();

  const dates = datesInMonth(month);
  const first = dates[0]!;
  const last = dates[dates.length - 1]!;
  const bookable = bookingWindow(settings, now);
  // Months entirely outside the booking window need no queries at all.
  const relevant = last >= bookable.firstBookableDate && first <= bookable.lastBookableDate;
  const [bookings, timeOff] = relevant
    ? await Promise.all([
        store.listActiveBookings(bookingQueryRange(first, last)),
        store.listTimeOff({ from: first, to: last }),
      ])
    : [[], []];

  const summary = summariseMonth({
    month,
    durationMinutes: service.durationMinutes,
    settings,
    bookings,
    timeOff,
    now,
  });

  return {
    month,
    timezone: BUSINESS_TIMEZONE,
    service: serviceSummary(service),
    days: summary.days,
    firstBookableDate: summary.firstBookableDate,
    lastBookableDate: summary.lastBookableDate,
  };
}
