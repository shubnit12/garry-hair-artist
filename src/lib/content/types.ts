/**
 * Normalised content shapes consumed by the UI.
 *
 * Every getter in `lib/content/get.ts` returns these types regardless of
 * whether the data came from Sanity or from the built-in fallback content, so
 * components never need to know where content lives.
 */

/** An image ready for `<SiteImage>` — either a local /public file or a Sanity CDN URL. */
export type SiteImage = {
  src: string;
  alt: string;
  width: number;
  height: number;
  /** Tiny base64 placeholder (Sanity LQIP) for blur-up loading. */
  blurDataURL?: string;
  /** Focal point in 0–1 coordinates, from the Sanity hotspot tool. */
  focus?: { x: number; y: number };
};

export const WEEKDAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

export type OpeningHours = {
  day: Weekday;
  closed: boolean;
  /** 24h "HH:mm" in the business timezone. */
  open: string;
  close: string;
};

export type SocialLinks = {
  instagram?: string;
  facebook?: string;
  tiktok?: string;
  youtube?: string;
};

export type Address = {
  street?: string;
  city: string;
  region: string;
  postalCode?: string;
  country: string;
};

export type Seo = {
  title?: string;
  description?: string;
};

export type SiteSettings = {
  businessName: string;
  shortName: string;
  tagline: string;
  description: string;
  /** Items scrolled in the announcement marquee above the header. */
  announcements: string[];
  email: string;
  phone?: string;
  address: Address;
  /** Free-text location used for the Google Maps embed + directions link. */
  mapQuery: string;
  social: SocialLinks;
  ogImage?: SiteImage;
};

export const SERVICE_CATEGORIES = [
  { value: "cut", label: "Cut & Style" },
  { value: "colour", label: "Colour" },
  { value: "treatment", label: "Treatments" },
  { value: "care", label: "Care & Relaxation" },
  { value: "consultation", label: "Consultation" },
] as const;
export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number]["value"];

export type Service = {
  id: string;
  name: string;
  slug: string;
  category: ServiceCategory;
  /** One-line description for cards. */
  summary: string;
  /** Longer description for the services page. */
  description?: string;
  durationMinutes: number;
  /** Price in CAD. Omit to show `priceNote` instead. */
  price?: number;
  /** Render as "From $90" rather than "$90". */
  priceFrom: boolean;
  /** Shown when there is no price, e.g. "Complimentary" or "By consultation". */
  priceNote?: string;
  image?: SiteImage;
  featured: boolean;
  bookable: boolean;
  order: number;
};

export type GalleryItem = {
  id: string;
  title: string;
  caption?: string;
  image: SiteImage;
};

export type Testimonial = {
  id: string;
  quote: string;
  name: string;
  service?: string;
  /** 1–5 */
  rating?: number;
};

export type ValueItem = { title: string; text: string };

export type HomePage = {
  seo: Seo;
  heroHeading: string;
  heroText: string;
  heroCtaLabel: string;
  /** Exactly two images render in the hero (narrow left, wide right). */
  heroImages: SiteImage[];
  /** Large vertical blackletter word in the hero sidebar. */
  heroScript: string;
  servicesHeading: string;
  servicesIntro: string;
  galleryHeading: string;
  galleryIntro: string;
  aboutHeading: string;
  aboutText: string;
  aboutImage: SiteImage;
  testimonialsHeading: string;
  ctaHeading: string;
  ctaText: string;
};

export type AboutPage = {
  seo: Seo;
  eyebrow: string;
  heading: string;
  intro: string;
  portrait: SiteImage;
  /** Paragraphs separated by blank lines. */
  story: string;
  philosophyHeading: string;
  philosophyText: string;
  values: ValueItem[];
};

export type ServicesPage = {
  seo: Seo;
  eyebrow: string;
  heading: string;
  intro: string;
  note: string;
};

export type ContactPage = {
  seo: Seo;
  eyebrow: string;
  heading: string;
  intro: string;
  formHeading: string;
  formIntro: string;
};

export type LegalPage = {
  seo: Seo;
  heading: string;
  /** Paragraphs separated by blank lines; lines starting with "## " are headings. */
  body: string;
  updatedAt?: string;
};

export type BookingSettings = {
  /** Granularity of start times offered to clients. */
  slotIntervalMinutes: number;
  /** Clean-up time automatically blocked after every appointment. */
  bufferMinutes: number;
  /** Earliest bookable time, measured from "now". */
  minNoticeMinutes: number;
  /** How far ahead clients may book. */
  maxAdvanceDays: number;
  weeklyHours: OpeningHours[];
  /** When true, website bookings are created as "confirmed" instead of "pending". */
  autoConfirm: boolean;
  /** Extra addresses notified of new bookings (added to BOOKING_NOTIFICATION_EMAIL). */
  notificationEmails: string[];
  cancellationPolicy: string;
  confirmationMessage: string;
};

/**
 * Blocked time entered in the Studio, expressed in the business timezone.
 * All-day entries block whole dates from `startDate` to `endDate` inclusive;
 * otherwise `startTime`–`endTime` is blocked on each of those dates.
 */
export type TimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  allDay: boolean;
  startTime?: string;
  endTime?: string;
  reason?: string;
};
