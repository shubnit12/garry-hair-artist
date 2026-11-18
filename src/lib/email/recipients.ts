import "server-only";

import { getBookingSettings, getSiteSettings } from "@/lib/content/get";
import { ownerNotificationEmails } from "@/lib/env.server";

/**
 * Who receives owner notifications (new bookings, cancellations, contact
 * messages): BOOKING_NOTIFICATION_EMAIL env + "Notification emails" from the
 * Studio's Booking settings. Falls back to the public business email so
 * notifications are never silently dropped.
 */
export async function getOwnerRecipients(): Promise<string[]> {
  const [booking, site] = await Promise.all([getBookingSettings(), getSiteSettings()]);
  const all = [...ownerNotificationEmails, ...booking.notificationEmails].map((email) =>
    email.trim().toLowerCase(),
  );
  const unique = Array.from(new Set(all.filter(Boolean)));
  return unique.length ? unique : [site.email];
}
