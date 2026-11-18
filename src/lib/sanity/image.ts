import { createImageUrlBuilder } from "@sanity/image-url";

import { sanityDataset, sanityProjectId } from "@/lib/env";
import type { SiteImage } from "@/lib/content/types";

/** Shape returned by the `image` projection in lib/sanity/queries.ts. */
export type RawSanityImage = {
  alt?: string | null;
  hotspot?: { x: number; y: number; width?: number; height?: number } | null;
  crop?: { top: number; bottom: number; left: number; right: number } | null;
  asset?: {
    _id: string;
    url?: string | null;
    lqip?: string | null;
    width?: number | null;
    height?: number | null;
  } | null;
} | null;

const builder = createImageUrlBuilder({
  projectId: sanityProjectId || "missing",
  dataset: sanityDataset,
});

/**
 * Converts a Sanity image (with optional crop + hotspot) into a `SiteImage`.
 * Returns `undefined` when the image has no uploaded asset.
 */
export function toSiteImage(
  raw: RawSanityImage | undefined,
  fallbackAlt = "",
): SiteImage | undefined {
  const asset = raw?.asset;
  if (!raw || !asset?._id || !asset.width || !asset.height) return undefined;

  const crop = raw.crop ?? { top: 0, bottom: 0, left: 0, right: 0 };
  const width = Math.max(1, Math.round(asset.width * (1 - crop.left - crop.right)));
  const height = Math.max(1, Math.round(asset.height * (1 - crop.top - crop.bottom)));

  // The builder applies the editor's crop as a `rect` parameter. Width,
  // quality and format are appended later by the <SiteImage> loader.
  const src = builder
    .image({ asset: { _ref: asset._id }, crop: raw.crop ?? undefined, hotspot: raw.hotspot ?? undefined })
    .url();

  // Translate the hotspot from full-image space into cropped-image space.
  let focus: SiteImage["focus"];
  if (raw.hotspot) {
    const cropW = 1 - crop.left - crop.right;
    const cropH = 1 - crop.top - crop.bottom;
    focus = {
      x: clamp01((raw.hotspot.x - crop.left) / (cropW || 1)),
      y: clamp01((raw.hotspot.y - crop.top) / (cropH || 1)),
    };
  }

  return {
    src,
    alt: raw.alt?.trim() || fallbackAlt,
    width,
    height,
    blurDataURL: asset.lqip ?? undefined,
    focus,
  };
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, Number.isFinite(value) ? value : 0.5));
}

export function isSanityImageUrl(src: string) {
  return src.startsWith("https://cdn.sanity.io/");
}
