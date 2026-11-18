import "server-only";

import type { Metadata } from "next";

import { getSiteSettings } from "@/lib/content/get";
import type { Seo, SiteSettings } from "@/lib/content/types";
import { siteUrl } from "@/lib/env";
import { isSanityImageUrl } from "@/lib/sanity/image";

import { OG_IMAGE_ALT, OG_IMAGE_PATH, OG_IMAGE_SIZE } from "./constants";

/** Absolute URL on the canonical origin: "/services" → "https://…/services". */
export function absoluteUrl(path = "/"): string {
  if (/^https?:\/\//i.test(path)) return path;
  if (path === "/" || path === "") return siteUrl;
  return `${siteUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Same default title the root layout uses, e.g. "Garry Hair Artist — Hair Artist in Surrey, BC". */
export function siteTitle(settings: SiteSettings): string {
  const location = [settings.address.city, settings.address.region].filter(Boolean).join(", ");
  return location ? `${settings.businessName} — Hair Artist in ${location}` : settings.businessName;
}

export type ShareImage = { url: string; width: number; height: number; alt: string };

/**
 * The image used when a page is shared: the "Social share image" uploaded in
 * the Studio (cropped to 1200×630 around its hotspot), otherwise the generated
 * brand card from app/opengraph-image.tsx. Relative URLs resolve against
 * `metadataBase`.
 */
export function getShareImage(settings: SiteSettings): ShareImage {
  const image = settings.ogImage;
  if (image && isSanityImageUrl(image.src)) {
    const params = new URLSearchParams({
      w: String(OG_IMAGE_SIZE.width),
      h: String(OG_IMAGE_SIZE.height),
      fit: "crop",
      fm: "jpg",
      q: "85",
    });
    if (image.focus) {
      params.set("crop", "focalpoint");
      params.set("fp-x", image.focus.x.toFixed(3));
      params.set("fp-y", image.focus.y.toFixed(3));
    }
    return {
      url: `${image.src}${image.src.includes("?") ? "&" : "?"}${params}`,
      ...OG_IMAGE_SIZE,
      alt: image.alt || settings.businessName,
    };
  }
  return { url: OG_IMAGE_PATH, ...OG_IMAGE_SIZE, alt: OG_IMAGE_ALT };
}

/**
 * Complete per-page metadata: title, description, canonical URL, Open Graph
 * and Twitter cards (with the share image).
 *
 * Use it from a page's `generateMetadata` so every page gets its own canonical
 * and keeps a share image — a page-level `openGraph` object otherwise replaces
 * the root one entirely, dropping the generated og:image.
 *
 * ```ts
 * export async function generateMetadata(): Promise<Metadata> {
 *   const page = await getServicesPage();
 *   return buildPageMetadata({ path: "/services", title: "Services & Prices", seo: page.seo });
 * }
 * ```
 */
export async function buildPageMetadata({
  path,
  title,
  description,
  seo,
  index = true,
}: {
  /** Canonical path, e.g. "/services". */
  path: string;
  /** Page title (the root template appends " | Business name"). Omit on the home page. */
  title?: string;
  description?: string;
  /** Editor overrides from the Studio "SEO" fields; they win over title/description. */
  seo?: Seo;
  /** Set to false for pages that must not appear in search results. */
  index?: boolean;
}): Promise<Metadata> {
  const settings = await getSiteSettings();
  const pageTitle = seo?.title?.trim() || title?.trim() || "";
  const pageDescription = seo?.description?.trim() || description?.trim() || settings.description;
  const socialTitle = pageTitle ? `${pageTitle} | ${settings.businessName}` : siteTitle(settings);
  const image = getShareImage(settings);

  // Only set keys that have values: an explicit `undefined` would reset the
  // value inherited from the root layout.
  const metadata: Metadata = {
    description: pageDescription,
    alternates: { canonical: path },
    openGraph: {
      type: "website",
      locale: "en_CA",
      siteName: settings.businessName,
      url: path,
      title: socialTitle,
      description: pageDescription,
      images: [image],
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: pageDescription,
      images: [{ url: image.url, alt: image.alt }],
    },
  };
  if (pageTitle) metadata.title = pageTitle;
  if (!index) metadata.robots = { index: false, follow: true };
  return metadata;
}
