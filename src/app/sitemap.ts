import type { MetadataRoute } from "next";

import { getAboutPage, getGallery, getHomePage } from "@/lib/content/get";
import type { SiteImage } from "@/lib/content/types";
import {
  type ContentSource,
  getContentTimestamps,
  latestTimestamp,
} from "@/lib/seo/content-timestamps";
import { absoluteUrl } from "@/lib/seo/metadata";
import { BOOK_HREF } from "@/lib/site";

type SitemapRoute = {
  path: string;
  changeFrequency: NonNullable<MetadataRoute.Sitemap[number]["changeFrequency"]>;
  priority: number;
  /** Content whose last publish date becomes this page's <lastmod>. */
  sources: readonly ContentSource[];
};

/** Public, indexable pages. Booking-management links (/booking/…) are private and excluded. */
const ROUTES: readonly SitemapRoute[] = [
  { path: "/", changeFrequency: "weekly", priority: 1, sources: ["homePage", "siteSettings", "service", "galleryItem", "testimonial"] },
  { path: "/services", changeFrequency: "weekly", priority: 0.9, sources: ["servicesPage", "service"] },
  { path: BOOK_HREF, changeFrequency: "weekly", priority: 0.9, sources: ["service", "bookingSettings"] },
  { path: "/about", changeFrequency: "monthly", priority: 0.7, sources: ["aboutPage"] },
  { path: "/contact", changeFrequency: "monthly", priority: 0.7, sources: ["contactPage", "siteSettings"] },
  { path: "/privacy", changeFrequency: "yearly", priority: 0.2, sources: ["privacyPage"] },
];

/** Absolute, XML-safe image URLs (Next does not escape sitemap values). */
function imageUrls(images: SiteImage[]): string[] {
  const urls = images.map((image) => absoluteUrl(image.src).replace(/&/g, "&amp;"));
  return Array.from(new Set(urls));
}

/**
 * /sitemap.xml — built from cached content, so it is prerendered and refreshed
 * whenever content is republished (no request-time clock reads).
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [timestamps, home, about, gallery] = await Promise.all([
    getContentTimestamps(),
    getHomePage(),
    getAboutPage(),
    getGallery(),
  ]);

  const images: Record<string, string[]> = {
    "/": imageUrls([...home.heroImages, ...gallery.map((item) => item.image)]),
    "/about": imageUrls([about.portrait]),
  };

  return ROUTES.map(({ path, changeFrequency, priority, sources }) => {
    const lastModified = latestTimestamp(timestamps, sources);
    return {
      url: absoluteUrl(path),
      changeFrequency,
      priority,
      ...(lastModified ? { lastModified } : {}),
      ...(images[path]?.length ? { images: images[path] } : {}),
    };
  });
}
