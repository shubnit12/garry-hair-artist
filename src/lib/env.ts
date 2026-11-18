/**
 * Centralised, typed access to environment variables.
 *
 * Public (NEXT_PUBLIC_*) values are inlined at build time and are safe to use
 * anywhere. Server-only secrets live in `env.server.ts` so they can never be
 * bundled into client code.
 */

export const sanityProjectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID ?? "";
export const sanityDataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
export const sanityApiVersion =
  process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-10-01";

/** True once a Sanity project has been connected via env vars. */
export const isSanityConfigured = /^[a-z0-9-]+$/.test(sanityProjectId);

function normaliseSiteUrl(raw: string | undefined): string {
  const fallback = "http://localhost:3000";
  if (!raw) return fallback;
  const withProtocol = raw.startsWith("http") ? raw : `https://${raw}`;
  return withProtocol.replace(/\/+$/, "");
}

/**
 * Canonical site origin, e.g. https://garryhairartist.com.
 * Falls back to the Vercel production URL, then localhost.
 */
export const siteUrl = normaliseSiteUrl(
  process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL,
);
