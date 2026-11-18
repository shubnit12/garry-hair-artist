"use client";

import Image, { type ImageLoader, type ImageProps } from "next/image";

import type { SiteImage as SiteImageData } from "@/lib/content/types";

/** Serves Sanity images straight from the Sanity CDN (resized + modern formats). */
const sanityLoader: ImageLoader = ({ src, width, quality }) => {
  const url = new URL(src);
  url.searchParams.set("w", String(width));
  url.searchParams.set("q", String(quality ?? 75));
  url.searchParams.set("auto", "format");
  url.searchParams.set("fit", "max");
  return url.toString();
};

type Props = Omit<ImageProps, "src" | "alt" | "width" | "height" | "loader" | "placeholder" | "blurDataURL"> & {
  image: SiteImageData;
  /** Override the CMS alt text (use "" for purely decorative images). */
  alt?: string;
};

/**
 * Renders a `SiteImage` from either /public or the Sanity CDN.
 * With `fill`, the image covers its parent and honours the editor's hotspot.
 */
export function SiteImage({ image, alt, fill, style, ...rest }: Props) {
  const isSanity = image.src.startsWith("https://cdn.sanity.io/");
  const objectPosition = image.focus
    ? `${Math.round(image.focus.x * 100)}% ${Math.round(image.focus.y * 100)}%`
    : undefined;

  return (
    <Image
      {...rest}
      src={image.src}
      alt={alt ?? image.alt}
      loader={isSanity ? sanityLoader : undefined}
      placeholder={image.blurDataURL ? "blur" : "empty"}
      blurDataURL={image.blurDataURL}
      {...(fill ? { fill: true } : { width: image.width, height: image.height })}
      style={{ objectFit: fill ? "cover" : undefined, objectPosition, ...style }}
    />
  );
}
