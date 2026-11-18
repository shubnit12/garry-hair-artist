/** Static, non-editable site constants. Editable copy lives in Sanity. */

/** Garry works in Surrey, BC — every booking time is in this zone. */
export const BUSINESS_TIMEZONE = "America/Vancouver";
export const BUSINESS_LOCALE = "en-CA";
export const CURRENCY = "CAD";

export const NAV_LINKS = [
  { href: "/", label: "Home" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
] as const;

export const BOOK_HREF = "/book";

/** Cache tag shared by every Sanity content query (see lib/content/get.ts). */
export const CONTENT_CACHE_TAG = "sanity-content";
