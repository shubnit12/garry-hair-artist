/**
 * HTTP contract for the booking system. Shared by the API routes
 * (src/app/api/...) and the booking UI (src/components/booking/...).
 *
 * All dates are "YYYY-MM-DD" and times "HH:mm" (24h) in the business timezone
 * (America/Vancouver). `start`/`end` are absolute ISO-8601 UTC instants.
 */

export type SlotStatus =
  /** Free to book. */
  | "available"
  /** Overlaps an existing appointment — shown to clients as "Booked". */
  | "booked"
  /** Past, inside the minimum-notice window, blocked as time off, or too
   *  close to closing / the next appointment for this service's duration. */
  | "unavailable";

export type TimeSlot = {
  time: string;
  start: string;
  status: SlotStatus;
};

export type AvailabilityResponse = {
  date: string;
  timezone: string;
  service: { slug: string; name: string; durationMinutes: number };
  /** True when the business is closed all day (weekly hours or time off). */
  closed: boolean;
  slots: TimeSlot[];
};

export type CalendarDayStatus =
  /** At least one available slot. */
  | "available"
  /** Open, but every slot is booked or unavailable. */
  | "full"
  /** Closed (weekly hours or time off). */
  | "closed"
  /** Past or beyond the booking window. */
  | "unavailable";

export type MonthAvailabilityResponse = {
  month: string; // "YYYY-MM"
  timezone: string;
  service: { slug: string; name: string; durationMinutes: number };
  days: { date: string; status: CalendarDayStatus }[];
  /** First and last dates clients may book at all. */
  firstBookableDate: string;
  lastBookableDate: string;
};

export type BookingStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no-show";

/** Booking details that are safe to return to the person who made it. */
export type PublicBooking = {
  id: string;
  /** Short human-friendly code, e.g. "GH-7K2P9". */
  reference: string;
  status: BookingStatus;
  serviceSlug: string;
  serviceName: string;
  durationMinutes: number;
  date: string;
  time: string;
  start: string;
  end: string;
  customerName: string;
  /** Relative URL of the signed "manage / cancel" page. */
  manageUrl: string;
  /** Relative URL of the signed .ics download. */
  calendarUrl: string;
};

export type CreateBookingResponse = {
  booking: PublicBooking;
  /** False when the booking was saved but a confirmation email failed. */
  emailSent: boolean;
  message: string;
};

export type ApiErrorCode =
  | "VALIDATION"
  | "SLOT_TAKEN"
  | "RATE_LIMITED"
  | "NOT_FOUND"
  | "FORBIDDEN"
  | "UNAVAILABLE"
  | "SERVER";

export type ApiError = {
  error: ApiErrorCode;
  message: string;
  fieldErrors?: Record<string, string[]>;
};
