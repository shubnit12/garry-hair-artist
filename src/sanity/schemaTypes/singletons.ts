import { CalendarIcon } from "@sanity/icons/Calendar";
import { CogIcon } from "@sanity/icons/Cog";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { HomeIcon } from "@sanity/icons/Home";
import { LockIcon } from "@sanity/icons/Lock";
import { TagsIcon } from "@sanity/icons/Tags";
import { UserIcon } from "@sanity/icons/User";
import { defineArrayMember, defineField, defineType } from "sanity";

import { imageField, WEEKDAY_OPTIONS } from "./objects";

/**
 * Singleton documents (one instance each, fixed IDs — see SINGLETON_IDS in
 * src/lib/sanity/queries.ts). Every text field is optional: empty fields fall
 * back to the built-in default copy on the website.
 */

const seoField = defineField({ name: "seo", title: "SEO", type: "seo", group: "seo" });

export const siteSettingsType = defineType({
  name: "siteSettings",
  title: "Site settings",
  type: "document",
  icon: CogIcon,
  groups: [
    { name: "brand", title: "Brand", default: true },
    { name: "contact", title: "Contact & location" },
    { name: "social", title: "Social" },
  ],
  fields: [
    defineField({ name: "businessName", title: "Business name", description: "Used in page titles, the header and emails.", type: "string", group: "brand", validation: (r) => r.max(60) }),
    defineField({ name: "shortName", title: "Short name", description: "Used in tight spaces, e.g. \"Garry\".", type: "string", group: "brand", validation: (r) => r.max(24) }),
    defineField({ name: "tagline", description: "A short phrase that sums up your work.", type: "string", group: "brand", validation: (r) => r.max(80) }),
    defineField({
      name: "description",
      title: "Default SEO description",
      description: "Used by search engines and social shares when a page has no description of its own.",
      type: "text",
      rows: 3,
      group: "brand",
      validation: (r) => r.max(200),
    }),
    defineField({
      name: "announcements",
      title: "Announcement bar",
      description: "Short messages scrolling across the top of every page.",
      type: "array",
      group: "brand",
      of: [defineArrayMember({ type: "string", validation: (r) => r.max(60) })],
      validation: (r) => r.max(8),
    }),
    { ...imageField("ogImage", "Social share image", { description: "Shown when the site is shared on social media / messaging apps. 1200×630 works best." }), group: "brand" },
    defineField({ name: "email", title: "Public email", description: "Shown on the website so clients can email you.", type: "string", group: "contact", validation: (r) => r.email() }),
    defineField({ name: "phone", title: "Phone", description: "Optional. Shown on the website when filled in.", type: "string", group: "contact" }),
    defineField({
      name: "address",
      type: "object",
      group: "contact",
      fields: [
        defineField({ name: "street", title: "Street address", description: "Leave empty to show only the city.", type: "string" }),
        defineField({ name: "city", type: "string", initialValue: "Surrey" }),
        defineField({ name: "region", title: "Province", type: "string", initialValue: "BC" }),
        defineField({ name: "postalCode", title: "Postal code", type: "string" }),
        defineField({ name: "country", type: "string", initialValue: "Canada" }),
      ],
    }),
    defineField({
      name: "mapQuery",
      title: "Map location",
      description: "Address or place name used for the Google Map and directions link.",
      type: "string",
      group: "contact",
    }),
    defineField({
      name: "social",
      title: "Social links",
      type: "object",
      group: "social",
      fields: ["instagram", "facebook", "tiktok", "youtube"].map((name) =>
        defineField({ name, type: "url", validation: (r) => r.uri({ scheme: ["https"] }) }),
      ),
    }),
  ],
  preview: { prepare: () => ({ title: "Site settings" }) },
});

export const homePageType = defineType({
  name: "homePage",
  title: "Home page",
  type: "document",
  icon: HomeIcon,
  groups: [
    { name: "hero", title: "Hero", default: true },
    { name: "sections", title: "Sections" },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({ name: "heroHeading", title: "Heading", description: "Short heading at the top of the home page.", type: "string", group: "hero", validation: (r) => r.max(60) }),
    defineField({ name: "heroText", title: "Intro text", description: "One or two sentences under the heading.", type: "text", rows: 3, group: "hero", validation: (r) => r.max(260) }),
    defineField({ name: "heroCtaLabel", title: "Button label", description: "Text of the booking link, e.g. \"Book Your Appointment\".", type: "string", group: "hero", validation: (r) => r.max(32) }),
    defineField({
      name: "heroImages",
      title: "Hero images",
      description: "Exactly two images: a narrow one (left) and a wide one (right). Portrait photos work best.",
      type: "array",
      group: "hero",
      of: [
        defineArrayMember({
          type: "image",
          options: { hotspot: true },
          fields: [defineField({ name: "alt", title: "Alt text", type: "string" })],
        }),
      ],
      validation: (r) => r.length(2).warning("The hero is designed for exactly two images"),
    }),
    defineField({ name: "heroScript", title: "Vertical script word", description: "Large blackletter word down the side of the hero.", type: "string", group: "hero", validation: (r) => r.max(16) }),
    defineField({ name: "servicesHeading", title: "Services heading", description: "Heading of the featured services panel (pick featured services under Services).", type: "string", group: "sections" }),
    defineField({ name: "servicesIntro", title: "Services intro", type: "string", group: "sections" }),
    defineField({ name: "galleryHeading", title: "Portfolio heading", description: "Heading above your portfolio photos (managed under Portfolio).", type: "string", group: "sections" }),
    defineField({ name: "galleryIntro", title: "Portfolio intro", type: "text", rows: 2, group: "sections" }),
    defineField({ name: "aboutHeading", title: "About heading", type: "string", group: "sections" }),
    defineField({ name: "aboutText", title: "About text", description: "Separate paragraphs with a blank line.", type: "text", rows: 6, group: "sections" }),
    { ...imageField("aboutImage", "About image"), group: "sections" },
    defineField({ name: "testimonialsHeading", title: "Testimonials heading", description: "This section only appears once you've added a testimonial.", type: "string", group: "sections" }),
    defineField({ name: "ctaHeading", title: "Booking banner heading", description: "The call to book near the bottom of the page.", type: "string", group: "sections" }),
    defineField({ name: "ctaText", title: "Booking banner text", type: "text", rows: 2, group: "sections" }),
    seoField,
  ],
  preview: { prepare: () => ({ title: "Home page" }) },
});

export const aboutPageType = defineType({
  name: "aboutPage",
  title: "About page",
  type: "document",
  icon: UserIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({ name: "eyebrow", type: "string", group: "content" }),
    defineField({ name: "heading", type: "string", group: "content" }),
    defineField({ name: "intro", type: "text", rows: 3, group: "content" }),
    { ...imageField("portrait", "Portrait"), group: "content" },
    defineField({ name: "story", description: "Separate paragraphs with a blank line.", type: "text", rows: 10, group: "content" }),
    defineField({ name: "philosophyHeading", title: "Philosophy heading", type: "string", group: "content" }),
    defineField({ name: "philosophyText", title: "Philosophy text", type: "text", rows: 4, group: "content" }),
    defineField({
      name: "values",
      type: "array",
      group: "content",
      of: [defineArrayMember({ type: "valueItem" })],
      validation: (r) => r.max(6),
    }),
    seoField,
  ],
  preview: { prepare: () => ({ title: "About page" }) },
});

export const servicesPageType = defineType({
  name: "servicesPage",
  title: "Services page",
  type: "document",
  icon: TagsIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({ name: "eyebrow", type: "string", group: "content" }),
    defineField({ name: "heading", type: "string", group: "content" }),
    defineField({ name: "intro", type: "text", rows: 3, group: "content" }),
    defineField({ name: "note", title: "Pricing note", type: "text", rows: 3, group: "content" }),
    seoField,
  ],
  preview: { prepare: () => ({ title: "Services page" }) },
});

export const contactPageType = defineType({
  name: "contactPage",
  title: "Contact page",
  type: "document",
  icon: EnvelopeIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({ name: "eyebrow", type: "string", group: "content" }),
    defineField({ name: "heading", type: "string", group: "content" }),
    defineField({ name: "intro", type: "text", rows: 3, group: "content" }),
    defineField({ name: "formHeading", title: "Form heading", type: "string", group: "content" }),
    defineField({ name: "formIntro", title: "Form intro", type: "text", rows: 3, group: "content" }),
    seoField,
  ],
  preview: { prepare: () => ({ title: "Contact page" }) },
});

export const privacyPageType = defineType({
  name: "privacyPage",
  title: "Privacy policy",
  type: "document",
  icon: LockIcon,
  groups: [
    { name: "content", title: "Content", default: true },
    { name: "seo", title: "SEO" },
  ],
  fields: [
    defineField({ name: "heading", type: "string", group: "content" }),
    defineField({
      name: "body",
      description: "Separate paragraphs with a blank line. Start a line with \"## \" to make it a heading.",
      type: "text",
      rows: 20,
      group: "content",
    }),
    seoField,
  ],
  preview: { prepare: () => ({ title: "Privacy policy" }) },
});

export const bookingSettingsType = defineType({
  name: "bookingSettings",
  title: "Booking settings",
  type: "document",
  icon: CalendarIcon,
  groups: [
    { name: "hours", title: "Hours", default: true },
    { name: "rules", title: "Booking rules" },
    { name: "messages", title: "Messages & notifications" },
  ],
  fields: [
    defineField({
      name: "weeklyHours",
      title: "Weekly opening hours",
      description: "Clients can only book inside these hours. Add one entry per day.",
      type: "array",
      group: "hours",
      of: [defineArrayMember({ type: "openingHours" })],
      validation: (r) =>
        r.max(7).custom((value: { day?: string }[] | undefined) => {
          const days = (value ?? []).map((entry) => entry.day);
          const duplicate = days.find((day, index) => day && days.indexOf(day) !== index);
          if (duplicate) return `${duplicate} is listed twice`;
          const missing = WEEKDAY_OPTIONS.filter((d) => !days.includes(d.value)).map((d) => d.title);
          return missing.length && value?.length ? `Missing days are treated as closed: ${missing.join(", ")}` : true;
        }).warning(),
    }),
    defineField({
      name: "slotIntervalMinutes",
      title: "Start-time interval",
      description: "How often appointment start times are offered.",
      type: "number",
      group: "rules",
      initialValue: 30,
      options: { list: [{ title: "Every 15 minutes", value: 15 }, { title: "Every 30 minutes", value: 30 }, { title: "Every hour", value: 60 }] },
    }),
    defineField({
      name: "bufferMinutes",
      title: "Buffer after each appointment (minutes)",
      description: "Clean-up / reset time kept free after every booking.",
      type: "number",
      group: "rules",
      initialValue: 15,
      validation: (r) => r.min(0).max(120).integer(),
    }),
    defineField({
      name: "minNoticeMinutes",
      title: "Minimum notice",
      description: "How far in advance clients must book.",
      type: "number",
      group: "rules",
      initialValue: 120,
      options: {
        list: [
          { title: "No minimum", value: 0 },
          { title: "1 hour", value: 60 },
          { title: "2 hours", value: 120 },
          { title: "4 hours", value: 240 },
          { title: "12 hours", value: 720 },
          { title: "24 hours", value: 1440 },
          { title: "48 hours", value: 2880 },
        ],
      },
    }),
    defineField({
      name: "maxAdvanceDays",
      title: "Booking window (days)",
      description: "How many days ahead clients can book.",
      type: "number",
      group: "rules",
      initialValue: 60,
      validation: (r) => r.min(1).max(365).integer(),
    }),
    defineField({
      name: "autoConfirm",
      title: "Confirm bookings automatically",
      description: "On: website bookings are confirmed instantly. Off: they arrive as \"pending\" for you to confirm.",
      type: "boolean",
      group: "rules",
      initialValue: true,
    }),
    defineField({
      name: "notificationEmails",
      title: "Notification emails",
      description:
        "New bookings, cancellations and contact messages are emailed here (in addition to the address configured on the server). These addresses can be read by anyone through Sanity's API, so only add ones you're happy to make public — a private inbox belongs in the server setting BOOKING_NOTIFICATION_EMAIL instead.",
      type: "array",
      group: "messages",
      of: [defineArrayMember({ type: "string", validation: (r) => r.email() })],
    }),
    defineField({ name: "confirmationMessage", title: "Confirmation message", description: "Shown to clients after booking.", type: "text", rows: 3, group: "messages" }),
    defineField({ name: "cancellationPolicy", title: "Cancellation policy", type: "text", rows: 4, group: "messages" }),
  ],
  preview: { prepare: () => ({ title: "Booking settings" }) },
});

/** Exported for structure.ts — the order here is the order in the Studio. */
export const singletonTypes = [
  siteSettingsType,
  homePageType,
  aboutPageType,
  servicesPageType,
  contactPageType,
  privacyPageType,
  bookingSettingsType,
];
