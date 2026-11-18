import "server-only";

import { cacheLife, cacheTag } from "next/cache";
import { defineQuery } from "next-sanity";

import { contentClient } from "@/lib/sanity/client";
import { CONTENT_CACHE_TAG } from "@/lib/site";

/**
 * Last published-change time per content type, for accurate sitemap
 * `<lastmod>` values. Cached like the other content getters and refreshed by
 * the /api/revalidate webhook (it shares the `sanity-content` tag).
 */

export const CONTENT_TIMESTAMPS_QUERY = defineQuery(`{
  "siteSettings": *[_id == "siteSettings"][0]._updatedAt,
  "homePage": *[_id == "homePage"][0]._updatedAt,
  "aboutPage": *[_id == "aboutPage"][0]._updatedAt,
  "servicesPage": *[_id == "servicesPage"][0]._updatedAt,
  "contactPage": *[_id == "contactPage"][0]._updatedAt,
  "privacyPage": *[_id == "privacyPage"][0]._updatedAt,
  "bookingSettings": *[_id == "bookingSettings"][0]._updatedAt,
  "service": *[_type == "service"] | order(_updatedAt desc)[0]._updatedAt,
  "galleryItem": *[_type == "galleryItem"] | order(_updatedAt desc)[0]._updatedAt,
  "testimonial": *[_type == "testimonial"] | order(_updatedAt desc)[0]._updatedAt
}`);

export type ContentSource =
  | "siteSettings"
  | "homePage"
  | "aboutPage"
  | "servicesPage"
  | "contactPage"
  | "privacyPage"
  | "bookingSettings"
  | "service"
  | "galleryItem"
  | "testimonial";

export type ContentTimestamps = Partial<Record<ContentSource, string | null>>;

/** Empty when Sanity is not connected (or unreachable) — the sitemap then omits lastmod. */
export async function getContentTimestamps(): Promise<ContentTimestamps> {
  "use cache";
  cacheLife("hours");
  cacheTag(CONTENT_CACHE_TAG, "sitemap");

  if (!contentClient) return {};
  try {
    // noStale: never re-cache a stale API CDN copy after the webhook expires the tag.
    return (
      (await contentClient.fetch<ContentTimestamps | null>(CONTENT_TIMESTAMPS_QUERY, {}, { cacheMode: "noStale" })) ?? {}
    );
  } catch (error) {
    console.error("[sitemap] Could not load content timestamps", error);
    return {};
  }
}

/** Latest valid ISO timestamp among `sources`, or undefined when none is known. */
export function latestTimestamp(
  timestamps: ContentTimestamps,
  sources: readonly ContentSource[],
): string | undefined {
  let latest: { time: number; value: string } | undefined;
  for (const source of sources) {
    const value = timestamps[source];
    const time = value ? Date.parse(value) : Number.NaN;
    if (value && Number.isFinite(time) && (!latest || time > latest.time)) latest = { time, value };
  }
  return latest?.value;
}
