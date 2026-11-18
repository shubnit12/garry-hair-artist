import { BlockElementIcon } from "@sanity/icons/BlockElement";
import { CalendarIcon } from "@sanity/icons/Calendar";
import { ClockIcon } from "@sanity/icons/Clock";
import { DoubleQuoteIcon } from "@sanity/icons/DoubleQuote";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { ImagesIcon } from "@sanity/icons/Images";
import { TagIcon } from "@sanity/icons/Tag";
import { defineArrayMember, defineField, defineType, type DocumentRule } from "sanity";

import { BookingServiceInput } from "../components/BookingServiceInput";
import { bookingDateWarning, bookingDurationWarning, bookingTimeWarning } from "../lib/bookingValidation";
import { BOOKING_STATUS_META, normaliseStatus } from "../lib/constants";
import { formatDateCompact, formatInstant, formatTime } from "../lib/dates";
import { generateReference } from "../../lib/booking/reference";
import { isPrivateDocumentId, type PrivateDocumentType } from "../../lib/private-ids";
import { imageField, TIME_OPTIONS, TIME_PATTERN, timeField } from "./objects";

/**
 * Collection documents.
 *
 * `booking`, `timeOff` and `contactMessage` use `liveEdit` so changes made in
 * the Studio (e.g. cancelling a booking or blocking a day) take effect on the
 * website immediately, without a separate "Publish" step.
 *
 * `booking` and `contactMessage` hold personal data, so they must sit under a
 * private ID (src/lib/private-ids.ts); `privateIdRule` flags any that don't.
 */

/**
 * Safety net for documents that hold personal data: one saved under a public
 * ID (e.g. created by a script) would be readable without logging in.
 */
function privateIdRule(type: PrivateDocumentType, label: string, fix: string) {
  return (rule: DocumentRule) =>
    rule.custom((_value, context) =>
      !context.document?._id || isPrivateDocumentId(type, context.document._id)
        ? true
        : `This ${label} was saved under a public ID, so its personal details can be read without logging in — and earlier versions stay readable by ID through Sanity's history API even after it is deleted, until history retention expires. Treat it as a data exposure. ${fix}`,
    );
}

export const SERVICE_CATEGORY_OPTIONS = [
  { title: "Cut & Style", value: "cut" },
  { title: "Colour", value: "colour" },
  { title: "Treatments", value: "treatment" },
  { title: "Care & Relaxation", value: "care" },
  { title: "Consultation", value: "consultation" },
];

export const serviceType = defineType({
  name: "service",
  title: "Service",
  type: "document",
  icon: TagIcon,
  groups: [
    { name: "details", title: "Details", default: true },
    { name: "pricing", title: "Pricing & time" },
    { name: "display", title: "Display" },
  ],
  fields: [
    defineField({
      name: "name",
      type: "string",
      description: "Shown on the website, in the booking form and in confirmation emails.",
      group: "details",
      validation: (r) => r.required().max(48),
    }),
    defineField({
      name: "slug",
      title: "URL slug",
      description: "Used in booking links, e.g. /book?service=haircut. Changing it breaks old links.",
      type: "slug",
      group: "details",
      options: { source: "name", maxLength: 64 },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "category",
      type: "string",
      group: "details",
      options: { list: SERVICE_CATEGORY_OPTIONS, layout: "radio" },
      initialValue: "cut",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "summary",
      title: "Short summary",
      description: "One line shown on service cards.",
      type: "string",
      group: "details",
      validation: (r) => r.required().max(110),
    }),
    defineField({ name: "description", title: "Full description", type: "text", rows: 4, group: "details", validation: (r) => r.max(600) }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      description: "How long to block in the calendar when this service is booked.",
      type: "number",
      group: "pricing",
      initialValue: 60,
      validation: (r) => r.required().min(5).max(720).integer(),
    }),
    defineField({
      name: "price",
      title: "Price (CAD)",
      description: "Leave empty to show the price note instead.",
      type: "number",
      group: "pricing",
      validation: (r) => r.min(0).precision(2),
    }),
    defineField({ name: "priceFrom", title: "Starting price", description: "Display as \"From $90\".", type: "boolean", group: "pricing", initialValue: true }),
    defineField({
      name: "priceNote",
      title: "Price note",
      description: "Shown when there is no price, e.g. \"Complimentary\" or \"By consultation\".",
      type: "string",
      group: "pricing",
    }),
    {
      ...imageField("image", "Image", { description: "Optional. Portrait photos work best." }),
      group: "display",
    },
    defineField({
      name: "featured",
      title: "Feature on home page",
      description: "Shown in the Signature Services section on the home page. Three services work best.",
      type: "boolean",
      group: "display",
      initialValue: false,
    }),
    defineField({
      name: "bookable",
      title: "Bookable online",
      description: "Turn off to list the service without letting clients book it online.",
      type: "boolean",
      group: "display",
      initialValue: true,
    }),
    defineField({ name: "order", title: "Sort order", description: "Lower numbers appear first.", type: "number", group: "display", initialValue: 100 }),
  ],
  orderings: [
    { title: "Menu order", name: "orderAsc", by: [{ field: "order", direction: "asc" }, { field: "name", direction: "asc" }] },
  ],
  preview: {
    select: { title: "name", duration: "durationMinutes", price: "price", priceNote: "priceNote", media: "image", bookable: "bookable" },
    prepare: ({ title, duration, price, priceNote, media, bookable }) => ({
      title,
      subtitle: [duration ? `${duration} min` : null, typeof price === "number" ? `$${price}` : priceNote, bookable === false ? "not bookable" : null]
        .filter(Boolean)
        .join(" · "),
      media,
    }),
  },
});

export const galleryItemType = defineType({
  name: "galleryItem",
  title: "Portfolio image",
  type: "document",
  icon: ImagesIcon,
  fields: [
    defineField({
      name: "title",
      description: "Short name for the look, e.g. \"Quiet Dimension\".",
      type: "string",
      validation: (r) => r.required().max(48),
    }),
    defineField({ name: "caption", description: "e.g. \"Dimensional colour · Gloss\"", type: "string", validation: (r) => r.max(80) }),
    imageField("image", "Image", {
      required: true,
      description: "Tall portrait photos look best. Drag the hotspot onto the hair so it stays in view when cropped.",
    }),
    defineField({ name: "order", title: "Sort order", description: "Lower numbers appear first.", type: "number", initialValue: 100 }),
  ],
  orderings: [{ title: "Sort order", name: "orderAsc", by: [{ field: "order", direction: "asc" }] }],
  preview: { select: { title: "title", subtitle: "caption", media: "image" } },
});

export const testimonialType = defineType({
  name: "testimonial",
  title: "Testimonial",
  type: "document",
  icon: DoubleQuoteIcon,
  description: "Add real reviews only (e.g. copied from Google with the client's permission).",
  fields: [
    defineField({
      name: "quote",
      description: "The client's own words, exactly as they wrote them.",
      type: "text",
      rows: 4,
      validation: (r) => r.required().max(400),
    }),
    defineField({ name: "name", title: "Client name", description: "First name + initial is fine.", type: "string", validation: (r) => r.required().max(48) }),
    defineField({ name: "service", description: "Optional, e.g. \"Balayage\".", type: "string", validation: (r) => r.max(48) }),
    defineField({
      name: "rating",
      description: "Optional star rating from the original review.",
      type: "number",
      options: { list: [5, 4, 3, 2, 1] },
      validation: (r) => r.min(1).max(5).integer(),
    }),
    defineField({
      name: "published",
      title: "Show on website",
      description: "Turn off to hide this review without deleting it.",
      type: "boolean",
      initialValue: true,
    }),
    defineField({ name: "order", title: "Sort order", description: "Lower numbers appear first.", type: "number", initialValue: 100 }),
  ],
  preview: {
    select: { title: "name", subtitle: "quote", published: "published" },
    prepare: ({ title, subtitle, published }) => ({
      title: published === false ? `${title} (hidden)` : title,
      subtitle,
    }),
  },
});

export const BOOKING_STATUS_OPTIONS = [
  { title: "Pending", value: "pending" },
  { title: "Confirmed", value: "confirmed" },
  { title: "Completed", value: "completed" },
  { title: "Cancelled", value: "cancelled" },
  { title: "No-show", value: "no-show" },
];

/**
 * A client appointment. Created by the website (source "website") or added
 * manually in the Studio for phone / walk-in bookings (source "studio").
 *
 * The booking engine treats `date` + `time` + `durationMinutes` (business
 * timezone) as the source of truth; `start`/`end` are UTC copies written by
 * the website for sorting and calendar exports.
 */
export const bookingType = defineType({
  name: "booking",
  title: "Booking",
  type: "document",
  icon: CalendarIcon,
  liveEdit: true,
  validation: privateIdRule(
    "booking",
    "booking",
    "Add it again with Bookings → New booking (or the Calendar's New booking button), then delete this copy.",
  ),
  fieldsets: [
    { name: "client", title: "Client", options: { columns: 1 } },
    { name: "system", title: "System details", options: { collapsible: true, collapsed: true } },
  ],
  fields: [
    defineField({
      name: "status",
      type: "string",
      description:
        "Pending and confirmed bookings hold the time slot. Cancelled, completed and no-show free it again. Tip: use the buttons at the bottom of this form to change the status.",
      options: { list: BOOKING_STATUS_OPTIONS, layout: "radio", direction: "horizontal" },
      initialValue: "confirmed",
      validation: (r) => r.required(),
    }),
    defineField({
      name: "service",
      type: "reference",
      description:
        "Picking a service fills in the duration below. If you switch service, check that the duration still fits.",
      to: [{ type: "service" }],
      // Weak, so a service can be retired even if old bookings mention it. The
      // input copies its name and duration onto the booking for that reason.
      weak: true,
      components: { input: BookingServiceInput },
      validation: (r) => r.required(),
    }),
    defineField({
      name: "date",
      type: "date",
      description: "Appointment date (Surrey, BC time).",
      options: { dateFormat: "ddd, MMM D, YYYY" },
      // Warnings only: Garry can still book someone in on purpose.
      validation: (r) => [r.required(), r.custom(bookingDateWarning).warning()],
    }),
    defineField({
      name: "time",
      title: "Start time",
      description: "Surrey, BC time. You'll see a warning if this clashes with another booking.",
      type: "string",
      options: { list: TIME_OPTIONS },
      validation: (r) => [
        r
          .required()
          .custom((value) =>
            value === undefined || TIME_PATTERN.test(String(value)) ? true : "Use 24-hour HH:mm, e.g. 09:30",
          ),
        r.custom(bookingTimeWarning).warning(),
      ],
    }),
    defineField({
      name: "durationMinutes",
      title: "Duration (minutes)",
      description:
        "How long to block in the calendar. Filled in from the service; change it if this appointment needs more or less time.",
      type: "number",
      validation: (r) => [r.min(5).max(720).integer(), r.custom(bookingDurationWarning).warning()],
    }),
    defineField({ name: "customerName", title: "Name", type: "string", fieldset: "client", validation: (r) => r.required().max(80) }),
    defineField({
      name: "customerEmail",
      title: "Email",
      description: "Confirmation and cancellation emails are sent here.",
      type: "string",
      fieldset: "client",
      validation: (r) => r.email(),
    }),
    defineField({ name: "customerPhone", title: "Phone", type: "string", fieldset: "client" }),
    defineField({ name: "notes", title: "Client notes", type: "text", rows: 3, fieldset: "client" }),
    defineField({ name: "internalNotes", title: "Private notes", description: "Only visible in the Studio.", type: "text", rows: 3 }),
    defineField({
      name: "reference",
      description: "Booking code shown to the client in emails.",
      type: "string",
      readOnly: true,
      fieldset: "system",
      // Studio bookings get a code when created, like website bookings.
      initialValue: () => generateReference(),
    }),
    defineField({
      name: "serviceName",
      title: "Service name (saved copy)",
      description: "Copied from the service when it's chosen. Shown in emails and on the client's booking page.",
      type: "string",
      readOnly: true,
      fieldset: "system",
    }),
    defineField({ name: "serviceSlug", type: "string", readOnly: true, fieldset: "system" }),
    defineField({ name: "start", title: "Start (UTC)", type: "datetime", readOnly: true, fieldset: "system" }),
    defineField({ name: "end", title: "End (UTC)", type: "datetime", readOnly: true, fieldset: "system" }),
    defineField({
      name: "source",
      type: "string",
      options: { list: ["website", "studio"] },
      initialValue: "studio",
      readOnly: true,
      fieldset: "system",
    }),
    defineField({ name: "createdAt", type: "datetime", readOnly: true, fieldset: "system" }),
    defineField({ name: "cancelledAt", type: "datetime", readOnly: true, fieldset: "system" }),
    defineField({
      name: "cancelledBy",
      type: "string",
      options: { list: ["client", "owner"] },
      readOnly: true,
      fieldset: "system",
    }),
    defineField({
      name: "notifiedStatus",
      title: "Last status emailed to client",
      description: "Used to avoid sending duplicate cancellation emails.",
      type: "string",
      readOnly: true,
      fieldset: "system",
    }),
  ],
  orderings: [
    { title: "Appointment (soonest first)", name: "dateAsc", by: [{ field: "date", direction: "asc" }, { field: "time", direction: "asc" }] },
    { title: "Appointment (latest first)", name: "dateDesc", by: [{ field: "date", direction: "desc" }, { field: "time", direction: "desc" }] },
    { title: "Recently booked", name: "createdDesc", by: [{ field: "createdAt", direction: "desc" }] },
  ],
  preview: {
    select: {
      name: "customerName",
      date: "date",
      time: "time",
      status: "status",
      serviceName: "serviceName",
      serviceSlug: "serviceSlug",
      serviceRefName: "service.name",
      serviceRefSlug: "service.slug.current",
    },
    prepare: ({ name, date, time, status, serviceName, serviceSlug, serviceRefName, serviceRefSlug }) => {
      // The saved name wins unless the reference now points at a different service.
      const switched = Boolean(serviceRefSlug) && serviceRefSlug !== serviceSlug;
      const service = (switched ? serviceRefName : serviceName || serviceRefName) || "Service";
      return {
        title: `${formatDateCompact(date)} · ${formatTime(time)} — ${name || "Unnamed"}`,
        subtitle: `${service} · ${BOOKING_STATUS_META[normaliseStatus(status)].title}`,
        media: CalendarIcon,
      };
    },
  },
});

type TimeOffDoc = { allDay?: boolean; startTime?: string; endTime?: string };

export const timeOffType = defineType({
  name: "timeOff",
  title: "Time off",
  type: "document",
  icon: ClockIcon,
  liveEdit: true,
  description: "Block dates or hours so clients cannot book them (holidays, breaks, personal time).",
  fields: [
    defineField({
      name: "reason",
      description:
        "Not shown on the website. Keep it general (e.g. \"Holiday\"): time off isn't stored as privately as bookings.",
      type: "string",
    }),
    defineField({ name: "startDate", title: "From", description: "First day off.", type: "date", validation: (r) => r.required() }),
    defineField({
      name: "endDate",
      title: "Until (inclusive)",
      description: "Leave empty for a single day.",
      type: "date",
      validation: (r) =>
        r.custom((value, context) => {
          const start = (context.document as { startDate?: string } | undefined)?.startDate;
          return !value || !start || value >= start ? true : "Must be on or after the start date";
        }),
    }),
    defineField({
      name: "allDay",
      title: "All day",
      description: "Turn off to block only part of the day, e.g. a long lunch or an appointment.",
      type: "boolean",
      initialValue: true,
    }),
    { ...timeField("startTime", "From time"), hidden: ({ document }) => (document as TimeOffDoc | undefined)?.allDay !== false },
    { ...timeField("endTime", "Until time"), hidden: ({ document }) => (document as TimeOffDoc | undefined)?.allDay !== false },
  ],
  validation: (r) =>
    r.custom((value) => {
      const doc = value as TimeOffDoc | undefined;
      if (!doc || doc.allDay !== false) return true;
      if (!doc.startTime || !doc.endTime) return "Set both times, or turn on \"All day\"";
      return doc.startTime < doc.endTime ? true : "End time must be after start time";
    }),
  orderings: [{ title: "Date", name: "startDesc", by: [{ field: "startDate", direction: "desc" }] }],
  preview: {
    select: { reason: "reason", startDate: "startDate", endDate: "endDate", allDay: "allDay", startTime: "startTime", endTime: "endTime" },
    prepare: ({ reason, startDate, endDate, allDay, startTime, endTime }) => ({
      title: reason || "Time off",
      subtitle: `${formatDateCompact(startDate)}${endDate && endDate !== startDate ? ` → ${formatDateCompact(endDate)}` : ""}${allDay === false ? ` · ${formatTime(startTime)} – ${formatTime(endTime)}` : " · all day"}`,
    }),
  },
});

export const CONTACT_STATUS_OPTIONS = [
  { title: "New", value: "new" },
  { title: "Replied", value: "replied" },
  { title: "Archived", value: "archived" },
];

export const contactMessageType = defineType({
  name: "contactMessage",
  title: "Message",
  type: "document",
  icon: EnvelopeIcon,
  liveEdit: true,
  validation: privateIdRule("contactMessage", "message", "Note the details, then delete it."),
  fields: [
    defineField({
      name: "status",
      type: "string",
      description: "Messages stay under Messages → New until you mark them Replied or Archived.",
      options: { list: CONTACT_STATUS_OPTIONS, layout: "radio", direction: "horizontal" },
      initialValue: "new",
    }),
    defineField({ name: "name", type: "string", readOnly: true }),
    defineField({ name: "email", type: "string", readOnly: true }),
    defineField({ name: "phone", type: "string", readOnly: true }),
    defineField({ name: "topic", type: "string", readOnly: true }),
    defineField({ name: "message", type: "text", rows: 8, readOnly: true }),
    defineField({ name: "createdAt", type: "datetime", readOnly: true }),
  ],
  orderings: [{ title: "Newest first", name: "createdDesc", by: [{ field: "createdAt", direction: "desc" }] }],
  preview: {
    select: { name: "name", topic: "topic", status: "status", createdAt: "createdAt" },
    prepare: ({ name, topic, status, createdAt }) => ({
      title: `${status === "new" ? "● " : ""}${name ?? "Unknown"}`,
      subtitle: [topic, formatInstant(createdAt)].filter(Boolean).join(" · "),
    }),
  },
});

/**
 * Internal concurrency guard: one document per calendar day, bumped inside the
 * same transaction that creates a booking. Hidden from the Studio menus.
 */
export const bookingDayLockType = defineType({
  name: "bookingDayLock",
  title: "Booking day lock (internal)",
  type: "document",
  icon: BlockElementIcon,
  liveEdit: true,
  readOnly: true,
  // Internal bookkeeping only — keep it out of the Studio's global search.
  __experimental_omnisearch_visibility: false,
  fields: [
    defineField({ name: "date", type: "date" }),
    defineField({ name: "version", type: "number" }),
    defineField({
      name: "entries",
      description: "Slots claimed through this lock (guards against query-index lag).",
      type: "array",
      of: [
        defineArrayMember({
          type: "object",
          fields: [
            defineField({ name: "time", type: "string" }),
            defineField({ name: "durationMinutes", type: "number" }),
            defineField({ name: "createdAt", type: "datetime" }),
          ],
        }),
      ],
    }),
  ],
});
