import { BUSINESS_LOCALE, CURRENCY } from "@/lib/site";
import type { OpeningHours, Service, Weekday } from "@/lib/content/types";

/** Pure formatting helpers shared by server and client components. */

const currency = new Intl.NumberFormat(BUSINESS_LOCALE, {
  style: "currency",
  currency: CURRENCY,
  maximumFractionDigits: 0,
});

/** "$90", "From $180", "Complimentary" or "By consultation". */
export function formatServicePrice(service: Pick<Service, "price" | "priceFrom" | "priceNote">): string {
  if (typeof service.price === "number") {
    const amount = currency.format(service.price).replace("CA", "").replace("US", "");
    return service.priceFrom ? `From ${amount}` : amount;
  }
  return service.priceNote || "By consultation";
}

/** 30 → "30 min", 60 → "1 hr", 150 → "2 hr 30 min". */
export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (!hours) return `${rest} min`;
  if (!rest) return `${hours} hr`;
  return `${hours} hr ${rest} min`;
}

/** "14:30" → "2:30 PM" */
export function formatTime24(value: string): string {
  const [h, m] = value.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return `${hour12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

/** "10:00 AM – 7:00 PM" or "Closed". */
export function formatOpeningHours(day: OpeningHours): string {
  return day.closed ? "Closed" : `${formatTime24(day.open)} – ${formatTime24(day.close)}`;
}

/**
 * Collapses consecutive days with identical hours:
 * [{label: "Tue – Fri", hours: "10:00 AM – 7:00 PM"}, ...]
 */
export function groupOpeningHours(week: OpeningHours[]): { label: string; hours: string }[] {
  const groups: { days: Weekday[]; hours: string }[] = [];
  for (const day of week) {
    const hours = formatOpeningHours(day);
    const last = groups.at(-1);
    if (last && last.hours === hours) last.days.push(day.day);
    else groups.push({ days: [day.day], hours });
  }
  const short = (day: Weekday) => WEEKDAY_LABELS[day].slice(0, 3);
  return groups.map(({ days, hours }) => ({
    label: days.length === 1 ? short(days[0]) : `${short(days[0])} – ${short(days.at(-1)!)}`,
    hours,
  }));
}

/** Splits editor text into paragraphs on blank lines. */
export function toParagraphs(text: string): string[] {
  return text
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function formatAddressLines(address: {
  street?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
}): string[] {
  return [
    address.street,
    [address.city, address.region].filter(Boolean).join(", ") +
      (address.postalCode ? ` ${address.postalCode}` : ""),
  ].filter((line): line is string => Boolean(line && line.trim()));
}

export function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

export function mapsDirectionsUrl(query: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(query)}`;
}

export function mapsEmbedUrl(query: string) {
  return `https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`;
}
