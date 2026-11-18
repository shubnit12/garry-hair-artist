import { z } from "zod";

/**
 * Validation schemas shared by the client forms (instant feedback) and the
 * API routes (authoritative). Never trust client-side validation alone.
 */

export const DATE_RE = /^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;
export const MONTH_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
export const SLUG_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const phone = z
  .string()
  .trim()
  .min(7, "Please enter a valid phone number")
  .max(25, "Please enter a valid phone number")
  .regex(/^[+()\d\s.-]+$/, "Please enter a valid phone number");

/**
 * True for text that carries a link, email address, markup or control
 * characters. Client names are echoed in emails ("Hi Jane"), where mail apps
 * would render or auto-link them, so names must be plain text.
 */
export function looksLikeLinkOrMarkup(value: string): boolean {
  return /[<>@/\\:\p{Cc}]|www\.|[\p{L}\p{N}]\.\p{L}{2,}/iu.test(value);
}

/** Honeypot: real users never see or fill this field. */
const honeypot = z.string().max(0).optional();

export const bookingRequestSchema = z.object({
  serviceSlug: z.string().regex(SLUG_RE, "Please choose a service"),
  date: z.string().regex(DATE_RE, "Please choose a date"),
  time: z.string().regex(TIME_RE, "Please choose a time"),
  name: z
    .string()
    .trim()
    .min(2, "Please enter your full name")
    .max(80, "Name is too long")
    .refine((value) => !looksLikeLinkOrMarkup(value), "Please enter just your name, without links or email addresses"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address").max(254)),
  phone,
  notes: z.string().trim().max(1000, "Notes are limited to 1000 characters").optional().default(""),
  consent: z.literal(true, "Please agree so we can manage your booking"),
  website: honeypot,
  /** Epoch ms when the form was first shown — used to reject instant bot submits. */
  startedAt: z.number().int().positive().optional(),
});

export type BookingRequest = z.input<typeof bookingRequestSchema>;
export type ValidBookingRequest = z.output<typeof bookingRequestSchema>;

export const availabilityQuerySchema = z.object({
  service: z.string().regex(SLUG_RE),
  date: z.string().regex(DATE_RE),
});

export const monthAvailabilityQuerySchema = z.object({
  service: z.string().regex(SLUG_RE),
  month: z.string().regex(MONTH_RE),
});

export const cancelBookingSchema = z.object({
  token: z.string().min(16).max(256),
});

export const contactMessageSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Please enter your name")
    .max(80, "Name is too long"),
  email: z.string().trim().toLowerCase().pipe(z.email("Please enter a valid email address").max(254)),
  phone: z
    .union([phone, z.literal("")])
    .optional()
    .default(""),
  /** Free text such as a service name or "General question". */
  topic: z.string().trim().max(80).optional().default(""),
  message: z
    .string()
    .trim()
    .min(10, "Please write a little more (at least 10 characters)")
    .max(2000, "Messages are limited to 2000 characters"),
  website: honeypot,
  startedAt: z.number().int().positive().optional(),
});

export type ContactMessageRequest = z.input<typeof contactMessageSchema>;
export type ValidContactMessage = z.output<typeof contactMessageSchema>;

/** Flattens zod issues into `{ field: [messages] }` for API responses and forms. */
export function fieldErrorsFrom(error: z.ZodError): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    const messages = (out[key] ??= []);
    if (!messages.includes(issue.message)) messages.push(issue.message);
  }
  return out;
}
