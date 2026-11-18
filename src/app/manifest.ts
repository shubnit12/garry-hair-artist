import type { MetadataRoute } from "next";

import { getSiteSettings } from "@/lib/content/get";
import {
  APPLE_ICON_PATH,
  APPLE_ICON_SIZE,
  BRAND_INK,
  ICON_PATH,
  ICON_SIZE,
} from "@/lib/seo/constants";
import { BOOK_HREF } from "@/lib/site";

/** /manifest.webmanifest — name, colours and icons for "Add to Home Screen". */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const settings = await getSiteSettings();

  return {
    id: "/",
    name: settings.businessName,
    short_name: settings.shortName || "Garry",
    description: settings.description,
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: BRAND_INK,
    theme_color: BRAND_INK,
    lang: "en-CA",
    dir: "ltr",
    categories: ["beauty", "lifestyle"],
    icons: [
      { src: ICON_PATH, sizes: `${ICON_SIZE}x${ICON_SIZE}`, type: "image/png" },
      { src: APPLE_ICON_PATH, sizes: `${APPLE_ICON_SIZE}x${APPLE_ICON_SIZE}`, type: "image/png", purpose: "any" },
    ],
    shortcuts: [
      { name: "Book an appointment", short_name: "Book", url: BOOK_HREF },
      { name: "Services & prices", short_name: "Services", url: "/services" },
    ],
  };
}
