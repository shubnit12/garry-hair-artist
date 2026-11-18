import "server-only";

import { cacheLife, cacheTag } from "next/cache";

import { contentClient } from "@/lib/sanity/client";
import {
  ABOUT_PAGE_QUERY,
  BOOKING_SETTINGS_QUERY,
  CONTACT_PAGE_QUERY,
  GALLERY_QUERY,
  HOME_PAGE_QUERY,
  PRIVACY_PAGE_QUERY,
  SERVICES_PAGE_QUERY,
  SERVICES_QUERY,
  SITE_SETTINGS_QUERY,
  TESTIMONIALS_QUERY,
} from "@/lib/sanity/queries";
import { CONTENT_CACHE_TAG } from "@/lib/site";

import { fallbackGallery, fallbackServices, fallbackTestimonials } from "./fallback";
import {
  normaliseAboutPage,
  normaliseBookingSettings,
  normaliseContactPage,
  normaliseGalleryItem,
  normaliseHomePage,
  normalisePrivacyPage,
  normaliseService,
  normaliseServicesPage,
  normaliseSiteSettings,
  normaliseTestimonial,
} from "./normalize";
import type {
  AboutPage,
  BookingSettings,
  ContactPage,
  GalleryItem,
  HomePage,
  LegalPage,
  Service,
  ServicesPage,
  SiteSettings,
  Testimonial,
} from "./types";

/**
 * Cached content getters for Server Components.
 *
 * Each result is cached with `use cache` and refreshed:
 *  - instantly, when Sanity calls the /api/revalidate webhook on publish, and
 *  - at most every minute otherwise (`cacheLife("minutes")`), so edits still
 *    appear even if the webhook has not been configured.
 *
 * If Sanity is not connected (or a request fails) the built-in fallback content
 * is returned, so public pages never break. The booking engine never uses these
 * getters: it reads live and fails closed (lib/booking/settings.ts).
 */

type Raw = Record<string, unknown> | null;

/**
 * `noStale` stops the API CDN from answering with a stale copy, which would
 * otherwise be cached again right after a publish webhook expired the tag.
 */
async function query<T = Raw>(groq: string): Promise<T | null> {
  if (!contentClient) return null;
  try {
    return await contentClient.fetch<T>(groq, {}, { cacheMode: "noStale" });
  } catch (error) {
    console.error("[content] Sanity query failed, using fallback content", error);
    return null;
  }
}

function tag(...tags: string[]) {
  cacheLife("minutes");
  cacheTag(CONTENT_CACHE_TAG, ...tags);
}

export async function getSiteSettings(): Promise<SiteSettings> {
  "use cache";
  tag("siteSettings");
  return normaliseSiteSettings(await query(SITE_SETTINGS_QUERY));
}

export async function getHomePage(): Promise<HomePage> {
  "use cache";
  tag("homePage");
  return normaliseHomePage(await query(HOME_PAGE_QUERY));
}

export async function getAboutPage(): Promise<AboutPage> {
  "use cache";
  tag("aboutPage");
  return normaliseAboutPage(await query(ABOUT_PAGE_QUERY));
}

export async function getServicesPage(): Promise<ServicesPage> {
  "use cache";
  tag("servicesPage");
  return normaliseServicesPage(await query(SERVICES_PAGE_QUERY));
}

export async function getContactPage(): Promise<ContactPage> {
  "use cache";
  tag("contactPage");
  return normaliseContactPage(await query(CONTACT_PAGE_QUERY));
}

export async function getPrivacyPage(): Promise<LegalPage> {
  "use cache";
  tag("privacyPage");
  return normalisePrivacyPage(await query(PRIVACY_PAGE_QUERY));
}

/** All services, ordered for display. Falls back to the default menu when empty. */
export async function getServices(): Promise<Service[]> {
  "use cache";
  tag("service");
  const raw = await query<Raw[]>(SERVICES_QUERY);
  const services = (raw ?? [])
    .map(normaliseService)
    .filter((service): service is Service => Boolean(service));
  return services.length ? services : fallbackServices;
}

export async function getBookableServices(): Promise<Service[]> {
  return (await getServices()).filter((service) => service.bookable);
}

export async function getServiceBySlug(slug: string): Promise<Service | undefined> {
  return (await getServices()).find((service) => service.slug === slug);
}

export async function getGallery(): Promise<GalleryItem[]> {
  "use cache";
  tag("galleryItem");
  const raw = await query<Raw[]>(GALLERY_QUERY);
  const items = (raw ?? [])
    .map(normaliseGalleryItem)
    .filter((item): item is GalleryItem => Boolean(item));
  return items.length ? items : fallbackGallery;
}

/** Real client reviews only — returns an empty list until some are added. */
export async function getTestimonials(): Promise<Testimonial[]> {
  "use cache";
  tag("testimonial");
  const raw = await query<Raw[]>(TESTIMONIALS_QUERY);
  const items = (raw ?? [])
    .map(normaliseTestimonial)
    .filter((item): item is Testimonial => Boolean(item));
  return items.length ? items : fallbackTestimonials;
}

/**
 * Booking settings for DISPLAY (opening hours in the footer, policy text).
 * The booking engine must not use this cached copy — see
 * lib/booking for the uncached variant.
 */
export async function getBookingSettings(): Promise<BookingSettings> {
  "use cache";
  tag("bookingSettings");
  return normaliseBookingSettings(await query(BOOKING_SETTINGS_QUERY));
}
