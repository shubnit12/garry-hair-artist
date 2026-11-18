import type { DocumentBadgeComponent } from "sanity";

import { BOOKING_STATUS_META, normaliseStatus } from "../lib/constants";

/** Coloured status badge shown in the booking editor's footer. */
export const BookingStatusBadge: DocumentBadgeComponent = (props) => {
  const booking = (props.draft ?? props.published) as { status?: string } | null;
  if (!booking) return null;

  const meta = BOOKING_STATUS_META[normaliseStatus(booking.status)];
  return { label: meta.title, title: meta.description, color: meta.badgeColor };
};
BookingStatusBadge.displayName = "BookingStatusBadge";
