import type { BadgeTone, CardTone } from "@sanity/ui";

import type { BookingStatus } from "../../lib/booking/types";
import { sanityApiVersion } from "../../lib/env";

/**
 * Studio-wide constants. Imports use relative paths (not the `@/` alias) so
 * the Sanity CLI can load this code outside of Next.js.
 */

/** API version for every Studio-side query (desk lists, Calendar, validation). */
export const STUDIO_API_VERSION = sanityApiVersion;

export type { BookingStatus };

/** Statuses that occupy time in the calendar (mirrors the booking engine). */
export const ACTIVE_BOOKING_STATUSES: readonly BookingStatus[] = ["pending", "confirmed"];

export function isActiveStatus(status: string | undefined): boolean {
  return ACTIVE_BOOKING_STATUSES.includes(normaliseStatus(status));
}

/**
 * Status used when a booking has none (or an unknown one). Matches the schema's
 * initial value and the booking engine, so the Studio, the website and the
 * status emails always agree. GROQ filters use it via `coalesce(status, …)`.
 */
export const DEFAULT_BOOKING_STATUS = "confirmed" satisfies BookingStatus;

export function normaliseStatus(status: string | undefined): BookingStatus {
  return status && status in BOOKING_STATUS_META ? (status as BookingStatus) : DEFAULT_BOOKING_STATUS;
}

type StatusMeta = {
  title: string;
  /** Short explanation for tooltips and screen readers. */
  description: string;
  /** Sanity UI tone for badges. */
  tone: BadgeTone;
  /** Sanity UI tone for calendar cards. */
  cardTone: CardTone;
  /** Colour of the document badge in the editor footer (undefined = grey). */
  badgeColor?: "primary" | "success" | "warning" | "danger";
};

export const BOOKING_STATUS_META: Record<BookingStatus, StatusMeta> = {
  pending: {
    title: "Pending",
    description: "Waiting for you to confirm",
    tone: "caution",
    cardTone: "caution",
    badgeColor: "warning",
  },
  confirmed: {
    title: "Confirmed",
    description: "Confirmed appointment",
    tone: "primary",
    cardTone: "primary",
    badgeColor: "primary",
  },
  completed: {
    title: "Completed",
    description: "The appointment took place",
    tone: "positive",
    cardTone: "positive",
    badgeColor: "success",
  },
  cancelled: {
    title: "Cancelled",
    description: "Cancelled — the time is free again",
    tone: "default",
    cardTone: "transparent",
  },
  "no-show": {
    title: "No-show",
    description: "The client did not turn up",
    tone: "critical",
    cardTone: "critical",
    badgeColor: "danger",
  },
};
