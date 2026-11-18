import type { BookingRequest } from "@/lib/booking/schema";
import type {
  ApiError,
  ApiErrorCode,
  AvailabilityResponse,
  CreateBookingResponse,
  MonthAvailabilityResponse,
  PublicBooking,
} from "@/lib/booking/types";

/**
 * Browser-side client for the booking HTTP API (see docs/ARCHITECTURE.md).
 * Every call resolves to a result object instead of throwing, so components
 * can render precise states for validation errors, conflicts, rate limits,
 * outages and dropped connections.
 */

export type ApiFailure =
  | { kind: "network"; timedOut: boolean }
  | {
      kind: "http";
      status: number;
      code: ApiErrorCode | null;
      message: string | null;
      fieldErrors?: Record<string, string[]>;
    };

export type ApiResult<T> = { ok: true; data: T } | { ok: false; failure: ApiFailure };

export type ManageBookingResponse = {
  booking: PublicBooking;
  canCancel: boolean;
  cancellationPolicy: string;
};

export type CancelBookingResponse = { booking: PublicBooking };

type Guard<T> = (value: unknown) => value is T;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

function isApiError(value: unknown): value is ApiError {
  return isRecord(value) && typeof value.error === "string" && typeof value.message === "string";
}

export function isPublicBooking(value: unknown): value is PublicBooking {
  return (
    isRecord(value) &&
    typeof value.id === "string" &&
    typeof value.reference === "string" &&
    typeof value.status === "string" &&
    typeof value.serviceName === "string" &&
    typeof value.date === "string" &&
    typeof value.time === "string" &&
    typeof value.durationMinutes === "number" &&
    typeof value.manageUrl === "string" &&
    typeof value.calendarUrl === "string"
  );
}

export function isDayAvailability(value: unknown): value is AvailabilityResponse {
  return (
    isRecord(value) &&
    typeof value.date === "string" &&
    typeof value.closed === "boolean" &&
    Array.isArray(value.slots) &&
    value.slots.every(
      (slot) => isRecord(slot) && typeof slot.time === "string" && typeof slot.status === "string",
    )
  );
}

export function isMonthAvailability(value: unknown): value is MonthAvailabilityResponse {
  return (
    isRecord(value) &&
    typeof value.month === "string" &&
    typeof value.firstBookableDate === "string" &&
    typeof value.lastBookableDate === "string" &&
    Array.isArray(value.days)
  );
}

export function isCreateBookingResponse(value: unknown): value is CreateBookingResponse {
  return isRecord(value) && isPublicBooking(value.booking) && typeof value.emailSent === "boolean";
}

export function isManageBookingResponse(value: unknown): value is ManageBookingResponse {
  return isRecord(value) && isPublicBooking(value.booking) && typeof value.canCancel === "boolean";
}

export function isCancelBookingResponse(value: unknown): value is CancelBookingResponse {
  return isRecord(value) && isPublicBooking(value.booking);
}

export async function requestJson<T>(
  url: string,
  {
    method = "GET",
    body,
    signal,
    validate,
  }: { method?: "GET" | "POST"; body?: unknown; signal?: AbortSignal; validate: Guard<T> },
): Promise<ApiResult<T>> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      signal,
      cache: "no-store",
      credentials: "same-origin",
      headers:
        body === undefined
          ? { Accept: "application/json" }
          : { Accept: "application/json", "Content-Type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    // Also reached when `signal` aborts; callers that abort ignore the result.
    const timedOut = error instanceof DOMException && error.name === "TimeoutError";
    return { ok: false, failure: { kind: "network", timedOut } };
  }

  let payload: unknown = null;
  try {
    payload = await response.json();
  } catch {
    // Empty or non-JSON body (e.g. a platform error page) — handled below.
  }

  if (response.ok) {
    if (validate(payload)) return { ok: true, data: payload };
    return { ok: false, failure: { kind: "http", status: 500, code: "SERVER", message: null } };
  }

  const apiError = isApiError(payload) ? payload : null;
  return {
    ok: false,
    failure: {
      kind: "http",
      status: response.status,
      code: apiError?.error ?? null,
      message: apiError?.message || null,
      fieldErrors: apiError?.fieldErrors,
    },
  };
}

/** A signal that aborts after `ms`, where supported. */
function timeoutSignal(ms: number): AbortSignal | undefined {
  return typeof AbortSignal !== "undefined" && "timeout" in AbortSignal ? AbortSignal.timeout(ms) : undefined;
}

export const dayAvailabilityUrl = (service: string, date: string) =>
  `/api/availability?${new URLSearchParams({ service, date })}`;

export const monthAvailabilityUrl = (service: string, month: string) =>
  `/api/availability/month?${new URLSearchParams({ service, month })}`;

export const bookingDetailsUrl = (id: string, token: string) =>
  `/api/bookings/${encodeURIComponent(id)}?${new URLSearchParams({ token })}`;

export function createBooking(request: BookingRequest) {
  return requestJson("/api/bookings", {
    method: "POST",
    body: request,
    signal: timeoutSignal(30_000),
    validate: isCreateBookingResponse,
  });
}

export function cancelBooking(id: string, token: string) {
  return requestJson(`/api/bookings/${encodeURIComponent(id)}/cancel`, {
    method: "POST",
    body: { token },
    signal: timeoutSignal(30_000),
    validate: isCancelBookingResponse,
  });
}

/** Human-readable explanation for a failed request. */
export function describeFailure(failure: ApiFailure, fallback: string): string {
  if (failure.kind === "network") {
    return failure.timedOut
      ? "The booking system is taking too long to respond. Please try again in a moment."
      : "We couldn't reach the booking system. Please check your connection and try again.";
  }
  if (failure.message) return failure.message;
  if (failure.status === 429) return "Too many requests. Please wait a minute and try again.";
  if (failure.status === 503) return "Online booking is temporarily unavailable.";
  return fallback;
}

/** True for outages where offering email / phone instead is the best help. */
export function isServiceOutage(failure: ApiFailure): boolean {
  return failure.kind === "network" || failure.status >= 500;
}
