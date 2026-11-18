import "server-only";

import { readFile } from "node:fs/promises";
import { join } from "node:path";

/**
 * Fonts for `next/og` ImageResponse (icons + Open Graph card).
 *
 * Read once at module scope: they never change per request, so the image
 * routes stay prerendered at build time (see "Predictable values" in the
 * Next.js caching docs). Satori reads TTF/OTF/WOFF — not WOFF2.
 */

const root = process.cwd();

/** Blackletter display face used for the "GH" monogram and headings. */
export const blackletterFont = await readFile(
  join(root, "node_modules/@fontsource/unifrakturmaguntia/files/unifrakturmaguntia-latin-400-normal.woff"),
);

/** Geist Regular — the default face bundled with next/og, for small labels. */
export const labelFont = await readFile(
  join(root, "node_modules/next/dist/compiled/@vercel/og/Geist-Regular.ttf"),
);

export const BLACKLETTER = "UnifrakturMaguntia";
export const LABEL = "Geist";

export const blackletterFontOption = {
  name: BLACKLETTER,
  data: blackletterFont,
  weight: 400,
  style: "normal",
} as const;

export const labelFontOption = {
  name: LABEL,
  data: labelFont,
  weight: 400,
  style: "normal",
} as const;
