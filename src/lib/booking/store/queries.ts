import { defineQuery } from "next-sanity";

/**
 * GROQ for the booking engine. Always run with the uncached `liveClient`.
 * A booking's status falls back to "confirmed" (the Studio's initial value)
 * and its duration to the referenced service's, then 60 minutes.
 */

export const ACTIVE_BOOKINGS_QUERY = defineQuery(`*[
  _type == "booking" &&
  coalesce(status, "confirmed") in ["pending", "confirmed"] &&
  defined(date) && defined(time) &&
  date >= $from && date <= $to
]{
  date,
  time,
  "durationMinutes": coalesce(durationMinutes, service->durationMinutes, 60)
}`);

/** Every booking (any status) on the dates — used inside the booking lock. */
export const DAY_BOOKINGS_QUERY = defineQuery(`*[
  _type == "booking" &&
  defined(date) && defined(time) &&
  date >= $from && date <= $to
]{
  "id": _id,
  "status": coalesce(status, "confirmed"),
  date,
  time,
  "durationMinutes": coalesce(durationMinutes, service->durationMinutes, 60)
}`);

/** Contact details of active bookings from a date on — used to cap online bookings per client. */
export const CLIENT_BOOKINGS_QUERY = defineQuery(`*[
  _type == "booking" &&
  coalesce(status, "confirmed") in ["pending", "confirmed"] &&
  defined(date) && defined(time) &&
  date >= $from
]{
  date,
  time,
  customerEmail,
  customerPhone
}`);

export const TIME_OFF_QUERY = defineQuery(`*[
  _type == "timeOff" &&
  defined(startDate) &&
  startDate <= $to &&
  coalesce(endDate, startDate) >= $from
]{
  "id": _id,
  startDate,
  "endDate": coalesce(endDate, startDate),
  "allDay": coalesce(allDay, true),
  startTime,
  endTime
}`);

export const BOOKING_BY_ID_QUERY = defineQuery(`*[_type == "booking" && _id == $id][0]{
  "id": _id,
  _rev,
  reference,
  status,
  "serviceId": service._ref,
  "serviceSlug": coalesce(service->slug.current, serviceSlug),
  "serviceName": select(
    defined(service->slug.current) && service->slug.current != serviceSlug => service->name,
    coalesce(serviceName, service->name)
  ),
  "durationMinutes": coalesce(durationMinutes, service->durationMinutes, 60),
  date,
  time,
  customerName,
  customerEmail,
  customerPhone,
  notes,
  source,
  createdAt,
  cancelledAt,
  cancelledBy,
  notifiedStatus
}`);

/**
 * One service by slug for the booking engine (same order as the services
 * list, so a duplicated slug resolves to the same service the page shows).
 */
export const SERVICE_BY_SLUG_QUERY = defineQuery(`*[_type == "service" && slug.current == $slug] | order(order asc, name asc)[0]{
  "id": _id,
  name,
  "slug": slug.current,
  durationMinutes,
  bookable
}`);
