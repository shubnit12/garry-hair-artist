import "server-only";

import { createClient, type SanityClient } from "next-sanity";

import {
  isSanityConfigured,
  sanityApiVersion,
  sanityDataset,
  sanityProjectId,
} from "@/lib/env";
import { sanityReadToken, sanityWriteToken } from "@/lib/env.server";

/**
 * All Sanity access happens on the server. The dataset is expected to be
 * PRIVATE (bookings and messages contain personal information), so every
 * client carries a token. Clients are `null` until the project is connected,
 * letting callers fall back gracefully.
 */

const base = {
  projectId: sanityProjectId,
  dataset: sanityDataset,
  apiVersion: sanityApiVersion,
  perspective: "published",
  stega: false,
} as const;

/**
 * CDN-backed client for public website content (services, pages, images).
 * The cached getters fetch with `cacheMode: "noStale"` so a refetch after a
 * publish webhook never stores the CDN's stale copy again.
 */
export const contentClient: SanityClient | null = isSanityConfigured
  ? createClient({
      ...base,
      useCdn: true,
      token: sanityReadToken || undefined,
    })
  : null;

/**
 * Uncached client for data that must be fresh to the second — availability
 * checks and booking reads. Never use the CDN for these.
 */
export const liveClient: SanityClient | null = isSanityConfigured
  ? createClient({
      ...base,
      useCdn: false,
      token: sanityReadToken || undefined,
    })
  : null;

/** Mutating client for bookings and contact messages. Requires an Editor token. */
export const writeClient: SanityClient | null =
  isSanityConfigured && sanityWriteToken
    ? createClient({
        ...base,
        useCdn: false,
        token: sanityWriteToken,
      })
    : null;
