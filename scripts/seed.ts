/**
 * Seeds Sanity with the website's default content and photos, so the Studio
 * starts out matching what the site shows before the CMS is connected.
 *
 *   npm run seed                   # safe: fill in what's missing (never overwrites)
 *   npm run seed -- -- --force     # REPLACE seeded documents with the defaults
 *   SEED_FORCE=1 npm run seed      # same as --force
 *
 * Runs through `sanity exec` and connects with NEXT_PUBLIC_SANITY_PROJECT_ID
 * and SANITY_API_WRITE_TOKEN from .env.local (see scripts/lib/script-client.ts),
 * so no `sanity login` is needed. It creates the 7 singletons, the 12
 * services, the portfolio images and the booking settings. It never creates
 * testimonials (those must be real reviews) or bookings.
 *
 * Safe mode creates singletons that don't exist yet, but only seeds services
 * and portfolio images into a dataset that has none of that type: re-running
 * it must never bring back a service or photo Garry deleted. `--force`
 * restores every default, including deleted ones.
 *
 * Imports are relative on purpose: path aliases are not guaranteed under
 * `sanity exec`.
 */

import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";

import {
  fallbackAboutPage,
  fallbackBookingSettings,
  fallbackContactPage,
  fallbackGallery,
  fallbackHomePage,
  fallbackPrivacyPage,
  fallbackServices,
  fallbackServicesPage,
  fallbackSiteSettings,
  localImages,
} from "../src/lib/content/fallback";
import type { Seo, SiteImage } from "../src/lib/content/types";
import { AUTH_HINT, createScriptClient, SCRIPT_ROOT, type ScriptClient } from "./lib/script-client";

type SanityDoc = { _id: string; _type: string; [key: string]: unknown };

const FORCE = process.argv.includes("--force") || /^(1|true|yes)$/i.test(process.env.SEED_FORCE ?? "");
const ROOT = SCRIPT_ROOT;

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
  ".avif": "image/avif",
};

type Client = ScriptClient;

/** Collections that safe mode only seeds while the dataset has none of them. */
const COLLECTION_LABELS: Record<string, string> = { service: "Services", galleryItem: "Portfolio images" };
const COLLECTION_TYPES = Object.keys(COLLECTION_LABELS);

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Drops `undefined` values and empty objects so documents stay tidy. */
function clean<T>(value: T): T {
  if (Array.isArray(value)) return value.map(clean) as T;
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .map(([key, entry]) => [key, clean(entry)] as const)
      .filter(
        ([, entry]) =>
          entry !== undefined &&
          !(entry && typeof entry === "object" && !Array.isArray(entry) && Object.keys(entry).length === 0),
      );
    return Object.fromEntries(entries) as T;
  }
  return value;
}

/** Stable, readable array keys (Sanity requires `_key` on objects in arrays). */
function key(prefix: string, index: number): string {
  return `${prefix}-${index + 1}`;
}

function seo(value: Seo | undefined) {
  return value && (value.title || value.description)
    ? { _type: "seo", title: value.title, description: value.description }
    : undefined;
}

/** Uploads each local photo once (deduplicated by SHA-1) and returns src → asset id. */
async function uploadImages(client: Client, images: SiteImage[]): Promise<Map<string, string>> {
  const assetIds = new Map<string, string>();
  const unique = [...new Map(images.map((image) => [image.src, image])).values()];

  for (const image of unique) {
    const filePath = path.join(ROOT, "public", image.src.replace(/^\/+/, ""));
    const buffer = await readFile(filePath);
    const sha1 = createHash("sha1").update(buffer).digest("hex");
    const filename = path.basename(filePath);

    const existing = await client.fetch<string | null>(
      `*[_type == "sanity.imageAsset" && sha1hash == $sha1][0]._id`,
      { sha1 },
    );
    if (existing) {
      assetIds.set(image.src, existing);
      console.log(`  ✓ ${filename} (already uploaded)`);
      continue;
    }

    const contentType = CONTENT_TYPES[path.extname(filename).toLowerCase()];
    const asset = await client.assets.upload("image", buffer, { filename, contentType });
    assetIds.set(image.src, asset._id);
    console.log(`  ↑ ${filename} uploaded`);
  }

  return assetIds;
}

function makeImageField(assetIds: Map<string, string>) {
  return (image: SiteImage | undefined, extra: Record<string, unknown> = {}) => {
    if (!image) return undefined;
    const assetId = assetIds.get(image.src);
    if (!assetId) throw new Error(`Image ${image.src} was not uploaded`);

    // Turn the fallback focal point into a Sanity hotspot that stays inside the image.
    const focus = image.focus;
    const hotspot = focus
      ? {
          _type: "sanity.imageHotspot",
          x: focus.x,
          y: focus.y,
          width: Math.min(0.8, 2 * Math.min(focus.x, 1 - focus.x)),
          height: Math.min(0.8, 2 * Math.min(focus.y, 1 - focus.y)),
        }
      : undefined;

    return {
      _type: "image",
      ...extra,
      asset: { _type: "reference", _ref: assetId },
      alt: image.alt,
      hotspot,
      crop: hotspot ? { _type: "sanity.imageCrop", top: 0, bottom: 0, left: 0, right: 0 } : undefined,
    };
  };
}

/* ------------------------------------------------------------------ */
/* Documents                                                           */
/* ------------------------------------------------------------------ */

function buildDocuments(image: ReturnType<typeof makeImageField>): SanityDoc[] {
  const site = fallbackSiteSettings;
  const home = fallbackHomePage;
  const about = fallbackAboutPage;
  const booking = fallbackBookingSettings;

  const singletons: SanityDoc[] = [
    {
      _id: "siteSettings",
      _type: "siteSettings",
      businessName: site.businessName,
      shortName: site.shortName,
      tagline: site.tagline,
      description: site.description,
      announcements: site.announcements,
      ogImage: image(site.ogImage),
      email: site.email,
      phone: site.phone,
      address: site.address,
      mapQuery: site.mapQuery,
      social: site.social,
    },
    {
      _id: "homePage",
      _type: "homePage",
      heroHeading: home.heroHeading,
      heroText: home.heroText,
      heroCtaLabel: home.heroCtaLabel,
      heroImages: home.heroImages.map((heroImage, index) => image(heroImage, { _key: key("hero", index) })),
      heroScript: home.heroScript,
      servicesHeading: home.servicesHeading,
      servicesIntro: home.servicesIntro,
      galleryHeading: home.galleryHeading,
      galleryIntro: home.galleryIntro,
      aboutHeading: home.aboutHeading,
      aboutText: home.aboutText,
      aboutImage: image(home.aboutImage),
      testimonialsHeading: home.testimonialsHeading,
      ctaHeading: home.ctaHeading,
      ctaText: home.ctaText,
      seo: seo(home.seo),
    },
    {
      _id: "aboutPage",
      _type: "aboutPage",
      eyebrow: about.eyebrow,
      heading: about.heading,
      intro: about.intro,
      portrait: image(about.portrait),
      story: about.story,
      philosophyHeading: about.philosophyHeading,
      philosophyText: about.philosophyText,
      values: about.values.map((value, index) => ({
        _key: key("value", index),
        _type: "valueItem",
        title: value.title,
        text: value.text,
      })),
      seo: seo(about.seo),
    },
    {
      _id: "servicesPage",
      _type: "servicesPage",
      eyebrow: fallbackServicesPage.eyebrow,
      heading: fallbackServicesPage.heading,
      intro: fallbackServicesPage.intro,
      note: fallbackServicesPage.note,
      seo: seo(fallbackServicesPage.seo),
    },
    {
      _id: "contactPage",
      _type: "contactPage",
      eyebrow: fallbackContactPage.eyebrow,
      heading: fallbackContactPage.heading,
      intro: fallbackContactPage.intro,
      formHeading: fallbackContactPage.formHeading,
      formIntro: fallbackContactPage.formIntro,
      seo: seo(fallbackContactPage.seo),
    },
    {
      _id: "privacyPage",
      _type: "privacyPage",
      heading: fallbackPrivacyPage.heading,
      body: fallbackPrivacyPage.body,
      seo: seo(fallbackPrivacyPage.seo),
    },
    {
      _id: "bookingSettings",
      _type: "bookingSettings",
      weeklyHours: booking.weeklyHours.map((hours, index) => ({
        _key: key(hours.day, index),
        _type: "openingHours",
        day: hours.day,
        closed: hours.closed,
        open: hours.open,
        close: hours.close,
      })),
      slotIntervalMinutes: booking.slotIntervalMinutes,
      bufferMinutes: booking.bufferMinutes,
      minNoticeMinutes: booking.minNoticeMinutes,
      maxAdvanceDays: booking.maxAdvanceDays,
      autoConfirm: booking.autoConfirm,
      // Garry adds his own addresses in the Studio.
      notificationEmails: [],
      confirmationMessage: booking.confirmationMessage,
      cancellationPolicy: booking.cancellationPolicy,
    },
  ];

  const services: SanityDoc[] = fallbackServices.map((service) => ({
    _id: service.id,
    _type: "service",
    name: service.name,
    slug: { _type: "slug", current: service.slug },
    category: service.category,
    summary: service.summary,
    description: service.description,
    durationMinutes: service.durationMinutes,
    price: service.price,
    priceFrom: service.priceFrom,
    priceNote: service.priceNote,
    image: image(service.image),
    featured: service.featured,
    bookable: service.bookable,
    order: service.order,
  }));

  const gallery: SanityDoc[] = fallbackGallery.map((item, index) => ({
    _id: item.id,
    _type: "galleryItem",
    title: item.title,
    caption: item.caption,
    image: image(item.image),
    order: (index + 1) * 10,
  }));

  return [...singletons, ...services, ...gallery].map((doc) => clean(doc));
}

/** Collection types that already have documents (drafts included). */
async function populatedCollections(client: Client): Promise<Set<string>> {
  const types = await client.fetch<string[]>(
    `array::unique(*[_type in $types]._type)`,
    { types: COLLECTION_TYPES },
    { perspective: "raw" },
  );
  return new Set(types);
}

/* ------------------------------------------------------------------ */
/* Run                                                                 */
/* ------------------------------------------------------------------ */

async function main() {
  const client = createScriptClient();
  const { projectId, dataset } = client.config();
  console.log(`\nSeeding Sanity project "${projectId}", dataset "${dataset}"`);
  console.log(
    FORCE
      ? "Mode: --force (existing seeded documents are REPLACED with the defaults)\n"
      : "Mode: safe (only missing documents are created; nothing is overwritten or restored)\n",
  );

  console.log("Images");
  const assetIds = await uploadImages(client, Object.values(localImages));

  // Safe mode leaves collections Garry already manages alone, so services or
  // photos he deleted are not recreated.
  const populated = FORCE ? new Set<string>() : await populatedCollections(client);
  const documents = buildDocuments(makeImageField(assetIds)).filter((doc) => !populated.has(doc._type));
  const ids = documents.map((doc) => doc._id);
  const existing = new Set(await client.fetch<string[]>(`*[_id in $ids]._id`, { ids }));

  const transaction = client.transaction();
  for (const doc of documents) {
    if (FORCE) transaction.createOrReplace(doc);
    else transaction.createIfNotExists(doc);
  }
  await transaction.commit();

  const created = ids.filter((id) => !existing.has(id));
  const kept = ids.filter((id) => existing.has(id));

  console.log("\nDocuments");
  for (const type of populated) {
    console.log(`  · ${COLLECTION_LABELS[type]}: skipped (already in the dataset; deleted ones are not restored)`);
  }
  for (const id of created) console.log(`  + ${id}`);
  for (const id of kept)
    console.log(FORCE ? `  ↻ ${id} (replaced)` : `  · ${id} (already exists, left unchanged)`);

  console.log(
    `\nDone: ${assetIds.size} images, ${created.length} documents created, ` +
      `${kept.length} ${FORCE ? "replaced" : "left unchanged"}.`,
  );
  if (!FORCE && (kept.length || populated.size)) {
    console.log(
      "Tip: `npm run seed -- -- --force` resets seeded documents to the defaults and restores deleted ones.",
    );
  }
  console.log("No testimonials or bookings were created.\n");
}

main().catch((error: unknown) => {
  console.error("\nSeeding failed:", error instanceof Error ? error.message : error);
  console.error(`${AUTH_HINT}\n`);
  process.exitCode = 1;
});
