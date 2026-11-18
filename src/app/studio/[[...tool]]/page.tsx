import type { Metadata, Viewport } from "next";
import { connection } from "next/server";
import { metadata as studioMetadata, viewport as studioViewport } from "next-sanity/studio";
import { Suspense } from "react";

import { isSanityConfigured } from "@/lib/env";

import { Studio } from "../_components/Studio";
import { StudioSetup } from "../_components/StudioSetup";

/**
 * Embedded Sanity Studio at /studio (and every /studio/* path — the Studio
 * does its own client-side routing). The page itself is a static shell; the
 * inherited metadata for this catch-all route resolves at request time, which
 * Next requires us to mark explicitly with <RequestTimeMarker />.
 */

export const metadata: Metadata = {
  ...studioMetadata,
  title: "Studio",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  ...studioViewport,
  // The Studio follows the system light/dark preference (unlike the always-dark website).
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#101112" },
  ],
};

async function Connection() {
  await connection();
  return null;
}

/** Renders nothing; tells Next the request-time metadata is intentional. */
function RequestTimeMarker() {
  return (
    <Suspense>
      <Connection />
    </Suspense>
  );
}

export default function StudioPage() {
  return (
    <>
      {isSanityConfigured ? <Studio /> : <StudioSetup />}
      <RequestTimeMarker />
    </>
  );
}
