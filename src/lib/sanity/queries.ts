import { defineQuery } from "next-sanity";

/**
 * GROQ queries for public website content. Field names here are the contract
 * between the Studio schemas (src/sanity/schemaTypes) and the normalisers in
 * lib/content/normalize.ts — change all three together.
 */

/** Fixed document IDs for singleton documents. */
export const SINGLETON_IDS = {
  siteSettings: "siteSettings",
  homePage: "homePage",
  aboutPage: "aboutPage",
  servicesPage: "servicesPage",
  contactPage: "contactPage",
  privacyPage: "privacyPage",
  bookingSettings: "bookingSettings",
} as const;

const image = /* groq */ `{
  alt,
  hotspot,
  crop,
  "asset": asset->{
    _id,
    url,
    "lqip": metadata.lqip,
    "width": metadata.dimensions.width,
    "height": metadata.dimensions.height
  }
}`;

const seo = /* groq */ `seo{ title, description }`;

export const SITE_SETTINGS_QUERY = defineQuery(`*[_id == "siteSettings"][0]{
  businessName,
  shortName,
  tagline,
  description,
  announcements,
  email,
  phone,
  address,
  mapQuery,
  social,
  "ogImage": ogImage${image}
}`);

export const HOME_PAGE_QUERY = defineQuery(`*[_id == "homePage"][0]{
  ${seo},
  heroHeading,
  heroText,
  heroCtaLabel,
  "heroImages": heroImages[]${image},
  heroScript,
  servicesHeading,
  servicesIntro,
  galleryHeading,
  galleryIntro,
  aboutHeading,
  aboutText,
  "aboutImage": aboutImage${image},
  testimonialsHeading,
  ctaHeading,
  ctaText
}`);

export const ABOUT_PAGE_QUERY = defineQuery(`*[_id == "aboutPage"][0]{
  ${seo},
  eyebrow,
  heading,
  intro,
  "portrait": portrait${image},
  story,
  philosophyHeading,
  philosophyText,
  values[]{ title, text }
}`);

export const SERVICES_PAGE_QUERY = defineQuery(`*[_id == "servicesPage"][0]{
  ${seo},
  eyebrow,
  heading,
  intro,
  note
}`);

export const CONTACT_PAGE_QUERY = defineQuery(`*[_id == "contactPage"][0]{
  ${seo},
  eyebrow,
  heading,
  intro,
  formHeading,
  formIntro
}`);

export const PRIVACY_PAGE_QUERY = defineQuery(`*[_id == "privacyPage"][0]{
  ${seo},
  heading,
  body,
  "updatedAt": _updatedAt
}`);

export const SERVICES_QUERY = defineQuery(`*[_type == "service" && defined(slug.current)] | order(order asc, name asc){
  "id": _id,
  name,
  "slug": slug.current,
  category,
  summary,
  description,
  durationMinutes,
  price,
  priceFrom,
  priceNote,
  featured,
  bookable,
  order,
  "image": image${image}
}`);

export const GALLERY_QUERY = defineQuery(`*[_type == "galleryItem" && defined(image.asset)] | order(order asc, _createdAt desc){
  "id": _id,
  title,
  caption,
  "image": image${image}
}`);

export const TESTIMONIALS_QUERY = defineQuery(`*[_type == "testimonial" && coalesce(published, true)] | order(order asc, _createdAt desc){
  "id": _id,
  quote,
  name,
  service,
  rating
}`);

export const BOOKING_SETTINGS_QUERY = defineQuery(`*[_id == "bookingSettings"][0]{
  slotIntervalMinutes,
  bufferMinutes,
  minNoticeMinutes,
  maxAdvanceDays,
  weeklyHours[]{ day, closed, open, close },
  autoConfirm,
  notificationEmails,
  cancellationPolicy,
  confirmationMessage
}`);
