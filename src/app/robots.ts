import type { MetadataRoute } from "next";

import { siteUrl } from "@/lib/env";

/**
 * /robots.txt — everything public is crawlable except the Studio, the API and
 * private booking-management links. Vercel preview deployments are kept out
 * of search results entirely.
 */
export default function robots(): MetadataRoute.Robots {
  if (process.env.VERCEL_ENV === "preview") {
    return { rules: { userAgent: "*", disallow: "/" } };
  }

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/studio", "/api/", "/booking/"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
