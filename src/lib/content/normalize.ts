import { toSiteImage, type RawSanityImage } from "@/lib/sanity/image";

import {
  fallbackAboutPage,
  fallbackBookingSettings,
  fallbackContactPage,
  fallbackHomePage,
  fallbackPrivacyPage,
  fallbackServicesPage,
  fallbackSiteSettings,
} from "./fallback";
import {
  SERVICE_CATEGORIES,
  WEEKDAYS,
  type AboutPage,
  type BookingSettings,
  type ContactPage,
  type GalleryItem,
  type HomePage,
  type LegalPage,
  type OpeningHours,
  type Seo,
  type Service,
  type ServiceCategory,
  type ServicesPage,
  type SiteImage,
  type SiteSettings,
  type Testimonial,
} from "./types";

/**
 * Normalisers turn raw (possibly partial) Sanity results into the strict UI
 * types, filling any empty field from the fallback content. This means an
 * editor can leave a field blank without breaking the page.
 */

type Raw = Record<string, unknown> | null | undefined;

const isFilledString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

export function str(value: unknown, fallback: string): string {
  return isFilledString(value) ? value.trim() : fallback;
}

export function optStr(value: unknown): string | undefined {
  return isFilledString(value) ? value.trim() : undefined;
}

export function num(value: unknown, fallback: number, min = -Infinity, max = Infinity): number {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.min(max, Math.max(min, value))
    : fallback;
}

function bool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

/**
 * A CMS image, or the fallback photo when none is set. `alt` is the generic
 * text for a CMS image without alt text — never the fallback photo's own
 * description, which would describe a different picture.
 */
function img(value: unknown, fallback: SiteImage, alt: string): SiteImage {
  return toSiteImage(value as RawSanityImage, alt) ?? fallback;
}

const PORTRAIT_ALT = "Garry, hair artist";

function seo(value: unknown, fallback: Seo): Seo {
  const raw = (value ?? {}) as Raw;
  return {
    title: optStr(raw?.title) ?? fallback.title,
    description: optStr(raw?.description) ?? fallback.description,
  };
}

const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/;

export function normaliseSiteSettings(raw: Raw): SiteSettings {
  const f = fallbackSiteSettings;
  const address = (raw?.address ?? {}) as Raw;
  const social = (raw?.social ?? {}) as Raw;
  const announcements = Array.isArray(raw?.announcements)
    ? (raw.announcements as unknown[]).filter(isFilledString)
    : [];

  return {
    businessName: str(raw?.businessName, f.businessName),
    shortName: str(raw?.shortName, f.shortName),
    tagline: str(raw?.tagline, f.tagline),
    description: str(raw?.description, f.description),
    announcements: announcements.length ? announcements : f.announcements,
    email: str(raw?.email, f.email),
    phone: optStr(raw?.phone) ?? f.phone,
    address: {
      street: optStr(address?.street) ?? f.address.street,
      city: str(address?.city, f.address.city),
      region: str(address?.region, f.address.region),
      postalCode: optStr(address?.postalCode) ?? f.address.postalCode,
      country: str(address?.country, f.address.country),
    },
    mapQuery: str(raw?.mapQuery, f.mapQuery),
    social: {
      instagram: optStr(social?.instagram),
      facebook: optStr(social?.facebook),
      tiktok: optStr(social?.tiktok),
      youtube: optStr(social?.youtube),
    },
    ogImage: toSiteImage(raw?.ogImage as RawSanityImage, f.businessName) ?? f.ogImage,
  };
}

export function normaliseHomePage(raw: Raw): HomePage {
  const f = fallbackHomePage;
  const heroImages = Array.isArray(raw?.heroImages)
    ? (raw.heroImages as RawSanityImage[])
        .map((image) => toSiteImage(image, "Hair by Garry"))
        .filter((image): image is SiteImage => Boolean(image))
    : [];

  return {
    seo: seo(raw?.seo, f.seo),
    heroHeading: str(raw?.heroHeading, f.heroHeading),
    heroText: str(raw?.heroText, f.heroText),
    heroCtaLabel: str(raw?.heroCtaLabel, f.heroCtaLabel),
    heroImages: heroImages.length >= 2 ? heroImages.slice(0, 2) : f.heroImages,
    heroScript: str(raw?.heroScript, f.heroScript),
    servicesHeading: str(raw?.servicesHeading, f.servicesHeading),
    servicesIntro: str(raw?.servicesIntro, f.servicesIntro),
    galleryHeading: str(raw?.galleryHeading, f.galleryHeading),
    galleryIntro: str(raw?.galleryIntro, f.galleryIntro),
    aboutHeading: str(raw?.aboutHeading, f.aboutHeading),
    aboutText: str(raw?.aboutText, f.aboutText),
    aboutImage: img(raw?.aboutImage, f.aboutImage, PORTRAIT_ALT),
    testimonialsHeading: str(raw?.testimonialsHeading, f.testimonialsHeading),
    ctaHeading: str(raw?.ctaHeading, f.ctaHeading),
    ctaText: str(raw?.ctaText, f.ctaText),
  };
}

export function normaliseAboutPage(raw: Raw): AboutPage {
  const f = fallbackAboutPage;
  const values = Array.isArray(raw?.values)
    ? (raw.values as Raw[])
        .map((item) => ({ title: optStr(item?.title), text: optStr(item?.text) }))
        .filter((item): item is { title: string; text: string } => Boolean(item.title && item.text))
    : [];

  return {
    seo: seo(raw?.seo, f.seo),
    eyebrow: str(raw?.eyebrow, f.eyebrow),
    heading: str(raw?.heading, f.heading),
    intro: str(raw?.intro, f.intro),
    portrait: img(raw?.portrait, f.portrait, PORTRAIT_ALT),
    story: str(raw?.story, f.story),
    philosophyHeading: str(raw?.philosophyHeading, f.philosophyHeading),
    philosophyText: str(raw?.philosophyText, f.philosophyText),
    values: values.length ? values : f.values,
  };
}

export function normaliseServicesPage(raw: Raw): ServicesPage {
  const f = fallbackServicesPage;
  return {
    seo: seo(raw?.seo, f.seo),
    eyebrow: str(raw?.eyebrow, f.eyebrow),
    heading: str(raw?.heading, f.heading),
    intro: str(raw?.intro, f.intro),
    note: str(raw?.note, f.note),
  };
}

export function normaliseContactPage(raw: Raw): ContactPage {
  const f = fallbackContactPage;
  return {
    seo: seo(raw?.seo, f.seo),
    eyebrow: str(raw?.eyebrow, f.eyebrow),
    heading: str(raw?.heading, f.heading),
    intro: str(raw?.intro, f.intro),
    formHeading: str(raw?.formHeading, f.formHeading),
    formIntro: str(raw?.formIntro, f.formIntro),
  };
}

export function normalisePrivacyPage(raw: Raw): LegalPage {
  const f = fallbackPrivacyPage;
  const hasBody = isFilledString(raw?.body);
  return {
    seo: seo(raw?.seo, f.seo),
    heading: str(raw?.heading, f.heading),
    body: hasBody ? (raw!.body as string) : f.body,
    updatedAt: hasBody ? optStr(raw?.updatedAt)?.slice(0, 10) : f.updatedAt,
  };
}

const categoryValues = SERVICE_CATEGORIES.map((c) => c.value) as readonly string[];

export function normaliseService(raw: Raw): Service | null {
  const name = optStr(raw?.name);
  const slug = optStr(raw?.slug);
  if (!raw || !name || !slug) return null;
  const category = categoryValues.includes(raw.category as string)
    ? (raw.category as ServiceCategory)
    : "cut";

  return {
    id: str(raw.id, slug),
    name,
    slug,
    category,
    summary: str(raw.summary, ""),
    description: optStr(raw.description),
    durationMinutes: num(raw.durationMinutes, 60, 5, 12 * 60),
    price: typeof raw.price === "number" && raw.price >= 0 ? raw.price : undefined,
    priceFrom: bool(raw.priceFrom, false),
    priceNote: optStr(raw.priceNote),
    image: toSiteImage(raw.image as RawSanityImage, name),
    featured: bool(raw.featured, false),
    bookable: bool(raw.bookable, true),
    order: num(raw.order, 100),
  };
}

export function normaliseGalleryItem(raw: Raw): GalleryItem | null {
  const title = optStr(raw?.title) ?? "Hair by Garry";
  const image = toSiteImage(raw?.image as RawSanityImage, title);
  if (!raw || !image) return null;
  return { id: str(raw.id, title), title, caption: optStr(raw.caption), image };
}

export function normaliseTestimonial(raw: Raw): Testimonial | null {
  const quote = optStr(raw?.quote);
  const name = optStr(raw?.name);
  if (!raw || !quote || !name) return null;
  return {
    id: str(raw.id, name),
    quote,
    name,
    service: optStr(raw.service),
    rating: typeof raw.rating === "number" ? num(raw.rating, 5, 1, 5) : undefined,
  };
}

export function normaliseBookingSettings(raw: Raw): BookingSettings {
  const f = fallbackBookingSettings;
  const rawHours = Array.isArray(raw?.weeklyHours) ? (raw.weeklyHours as Raw[]) : [];

  // Always return exactly one entry per weekday, Monday first.
  const weeklyHours: OpeningHours[] = WEEKDAYS.map((day) => {
    const fromCms = rawHours.find((entry) => entry?.day === day);
    const fallbackDay = f.weeklyHours.find((entry) => entry.day === day)!;
    if (!fromCms) return rawHours.length ? { ...fallbackDay, closed: true } : fallbackDay;
    const open = HHMM.test(String(fromCms.open)) ? String(fromCms.open) : fallbackDay.open;
    const close = HHMM.test(String(fromCms.close)) ? String(fromCms.close) : fallbackDay.close;
    return {
      day,
      closed: bool(fromCms.closed, false) || open >= close,
      open,
      close,
    };
  });

  return {
    slotIntervalMinutes: num(raw?.slotIntervalMinutes, f.slotIntervalMinutes, 5, 120),
    bufferMinutes: num(raw?.bufferMinutes, f.bufferMinutes, 0, 120),
    minNoticeMinutes: num(raw?.minNoticeMinutes, f.minNoticeMinutes, 0, 14 * 24 * 60),
    maxAdvanceDays: num(raw?.maxAdvanceDays, f.maxAdvanceDays, 1, 365),
    weeklyHours,
    autoConfirm: bool(raw?.autoConfirm, f.autoConfirm),
    notificationEmails: Array.isArray(raw?.notificationEmails)
      ? (raw.notificationEmails as unknown[])
          .filter(isFilledString)
          .map((email) => email.trim().toLowerCase())
          .filter((email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      : f.notificationEmails,
    cancellationPolicy: str(raw?.cancellationPolicy, f.cancellationPolicy),
    confirmationMessage: str(raw?.confirmationMessage, f.confirmationMessage),
  };
}
