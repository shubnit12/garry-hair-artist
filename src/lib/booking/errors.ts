import type { ApiErrorCode } from "./types";

/** The requested slot was taken (or became unavailable) while booking. */
export class SlotTakenError extends Error {
  constructor(message = "The requested time is no longer available") {
    super(message);
    this.name = "SlotTakenError";
  }
}

/** A booking changed concurrently and retries were exhausted. */
export class BookingConflictError extends Error {
  constructor(message = "The booking was modified concurrently") {
    super(message);
    this.name = "BookingConflictError";
  }
}

/** An expected failure that maps directly onto an `ApiError` response. */
export class BookingError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly fieldErrors?: Record<string, string[]>;
  readonly retryAfterSeconds?: number;

  constructor(
    status: number,
    code: ApiErrorCode,
    message: string,
    options: { fieldErrors?: Record<string, string[]>; retryAfterSeconds?: number } = {},
  ) {
    super(message);
    this.name = "BookingError";
    this.status = status;
    this.code = code;
    this.fieldErrors = options.fieldErrors;
    this.retryAfterSeconds = options.retryAfterSeconds;
  }
}

export const MESSAGES = {
  unavailable: "Online booking is temporarily unavailable — please contact us",
  generic: "Something went wrong — please try again or contact us.",
  slotTaken: "Sorry — that time was just booked. Please choose another time.",
  slotUnavailable: "Sorry — that time is no longer available. Please choose another time.",
  timeNotOffered: "That time isn't offered — please choose another.",
  tooFast: "Please take a moment to review your details and submit again.",
  rateLimited: "Too many requests — please wait a moment and try again.",
  /**
   * Both per-client limits answer with this exact response, so a refusal doesn't say which
   * limit fired. (A refusal can still mean the email has upcoming appointments; probing that
   * needs the address, and a probe that isn't refused books — and emails — its owner.)
   */
  bookingLimit:
    "You've reached the limit for online bookings with this email address. To book again or change an existing appointment, please contact Garry directly.",
  validation: "Please check the highlighted fields and try again.",
  serviceNotFound: "We couldn't find that service. Please choose another.",
  bookingNotFound: "We couldn't find that booking.",
  forbidden: "This link is invalid or has expired. Please use the link from your confirmation email.",
} as const;

/** Short, PII-free description of an error for server logs. */
export function describeError(error: unknown): string {
  if (error instanceof Error) {
    const status = (error as { statusCode?: unknown }).statusCode;
    return `${error.name}: ${error.message}${typeof status === "number" ? ` (HTTP ${status})` : ""}`;
  }
  return String(error);
}
