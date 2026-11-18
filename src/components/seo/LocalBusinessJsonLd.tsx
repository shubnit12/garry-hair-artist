import { getBookingSettings, getServices, getSiteSettings } from "@/lib/content/get";
import { siteUrl } from "@/lib/env";
import { APPLE_ICON_PATH, OG_IMAGE_PATH } from "@/lib/seo/constants";
import { absoluteUrl, getShareImage } from "@/lib/seo/metadata";
import { buildLocalBusinessJsonLd } from "@/lib/seo/structured-data";

import { JsonLd } from "./JsonLd";

/**
 * schema.org HairSalon description of the business (name, contact, hours,
 * services and the online booking action), rendered once in the site layout.
 * Built from cached content, so it is part of the static shell.
 */
export async function LocalBusinessJsonLd() {
  const [settings, booking, services] = await Promise.all([
    getSiteSettings(),
    getBookingSettings(),
    getServices(),
  ]);

  const images = [absoluteUrl(getShareImage(settings).url), absoluteUrl(OG_IMAGE_PATH)];

  return (
    <JsonLd
      data={buildLocalBusinessJsonLd({
        siteUrl,
        settings,
        weeklyHours: booking.weeklyHours,
        services,
        images,
        logoUrl: absoluteUrl(APPLE_ICON_PATH),
      })}
    />
  );
}
