import { afterEach, describe, expect, it, vi } from "vitest";

import {
  fallbackAboutPage,
  fallbackGallery,
  fallbackHomePage,
  fallbackSiteSettings,
} from "@/lib/content/fallback";
import { siteUrl } from "@/lib/env";

const mocks = vi.hoisted(() => ({
  timestamps: {} as Record<string, string | null>,
  getSiteSettings: vi.fn(),
}));

vi.mock("@/lib/content/get", async () => {
  const fallback = await import("@/lib/content/fallback");
  return {
    getSiteSettings: mocks.getSiteSettings,
    getHomePage: async () => fallback.fallbackHomePage,
    getAboutPage: async () => fallback.fallbackAboutPage,
    getGallery: async () => fallback.fallbackGallery,
  };
});
vi.mock("@/lib/seo/content-timestamps", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/seo/content-timestamps")>();
  return { ...actual, getContentTimestamps: async () => mocks.timestamps };
});

import manifest from "@/app/manifest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";

import { latestTimestamp } from "./content-timestamps";
import { absoluteUrl, buildPageMetadata, getShareImage } from "./metadata";

afterEach(() => {
  vi.unstubAllEnvs();
  mocks.timestamps = {};
});

mocks.getSiteSettings.mockImplementation(async () => fallbackSiteSettings);

describe("sitemap", () => {
  it("lists the public pages with absolute URLs and no private routes", async () => {
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      siteUrl,
      `${siteUrl}/services`,
      `${siteUrl}/book`,
      `${siteUrl}/about`,
      `${siteUrl}/contact`,
      `${siteUrl}/privacy`,
    ]);
    expect(entries[0]).toMatchObject({ priority: 1, changeFrequency: "weekly" });
  });

  it("omits lastmod when no content timestamps are known", async () => {
    const entries = await sitemap();
    expect(entries.every((entry) => entry.lastModified === undefined)).toBe(true);
  });

  it("uses the latest publish time of each page's content as lastmod", async () => {
    mocks.timestamps = {
      homePage: "2026-09-01T10:00:00Z",
      galleryItem: "2026-10-20T08:30:00Z",
      service: "2026-10-01T12:00:00Z",
      aboutPage: null,
    };
    const entries = await sitemap();
    const byUrl = Object.fromEntries(entries.map((entry) => [entry.url, entry.lastModified]));

    expect(byUrl[siteUrl]).toBe("2026-10-20T08:30:00Z");
    expect(byUrl[`${siteUrl}/services`]).toBe("2026-10-01T12:00:00Z");
    expect(byUrl[`${siteUrl}/about`]).toBeUndefined();
  });

  it("adds absolute image URLs for the home and about pages", async () => {
    const entries = await sitemap();
    const home = entries.find((entry) => entry.url === siteUrl);
    const about = entries.find((entry) => entry.url === `${siteUrl}/about`);

    const homeImages = [...fallbackHomePage.heroImages, ...fallbackGallery.map((item) => item.image)];
    expect(home?.images).toEqual(Array.from(new Set(homeImages.map((image) => `${siteUrl}${image.src}`))));
    expect(about?.images).toEqual([`${siteUrl}${fallbackAboutPage.portrait.src}`]);
  });
});

describe("robots", () => {
  it("allows crawling except the Studio, API and booking links", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(robots()).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/studio", "/api/", "/booking/"] },
      sitemap: `${siteUrl}/sitemap.xml`,
    });
  });

  it("blocks everything on preview deployments", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(robots()).toEqual({ rules: { userAgent: "*", disallow: "/" } });
  });
});

describe("manifest", () => {
  it("uses the brand name, ink colours and generated icons", async () => {
    const result = await manifest();
    expect(result).toMatchObject({
      name: "Garry Hair Artist",
      short_name: "Garry",
      background_color: "#111111",
      theme_color: "#111111",
      start_url: "/",
    });
    expect(result.icons?.map((icon) => icon.src)).toEqual(["/icon", "/apple-icon"]);
  });
});

describe("latestTimestamp", () => {
  it("returns the newest valid timestamp", () => {
    expect(
      latestTimestamp(
        { homePage: "2026-01-01T00:00:00Z", service: "2026-03-01T00:00:00Z", galleryItem: "not a date" },
        ["homePage", "service", "galleryItem"],
      ),
    ).toBe("2026-03-01T00:00:00Z");
    expect(latestTimestamp({}, ["homePage"])).toBeUndefined();
  });
});

describe("page metadata", () => {
  it("builds absolute URLs on the canonical origin", () => {
    expect(absoluteUrl("/")).toBe(siteUrl);
    expect(absoluteUrl("/services")).toBe(`${siteUrl}/services`);
    expect(absoluteUrl("about")).toBe(`${siteUrl}/about`);
    expect(absoluteUrl("https://cdn.sanity.io/x.jpg")).toBe("https://cdn.sanity.io/x.jpg");
  });

  it("falls back to the generated share card for local images", () => {
    expect(getShareImage(fallbackSiteSettings)).toMatchObject({ url: "/opengraph-image", width: 1200, height: 630 });
  });

  it("crops an uploaded Sanity share image to 1200×630 around its hotspot", () => {
    const image = getShareImage({
      ...fallbackSiteSettings,
      ogImage: {
        src: "https://cdn.sanity.io/images/abc/production/img-2000x1500.jpg?rect=0,0,2000,1400",
        alt: "Salon chair",
        width: 2000,
        height: 1400,
        focus: { x: 0.25, y: 0.5 },
      },
    });
    const url = new URL(image.url);

    expect(url.searchParams.get("rect")).toBe("0,0,2000,1400");
    expect(url.searchParams.get("w")).toBe("1200");
    expect(url.searchParams.get("h")).toBe("630");
    expect(url.searchParams.get("fp-x")).toBe("0.250");
    expect(image.alt).toBe("Salon chair");
  });

  it("sets canonical, Open Graph and Twitter data for a page", async () => {
    const metadata = await buildPageMetadata({ path: "/services", title: "Services & Prices" });

    expect(metadata).toMatchObject({
      title: "Services & Prices",
      description: fallbackSiteSettings.description,
      alternates: { canonical: "/services" },
      openGraph: { url: "/services", title: "Services & Prices | Garry Hair Artist" },
      twitter: { card: "summary_large_image" },
    });
    expect(metadata.robots).toBeUndefined();
  });

  it("prefers Studio SEO fields and leaves the home title to the root default", async () => {
    const metadata = await buildPageMetadata({
      path: "/",
      seo: { description: "Custom description" },
      index: false,
    });

    expect(metadata).not.toHaveProperty("title");
    expect(metadata.description).toBe("Custom description");
    expect(metadata.openGraph?.title).toBe("Garry Hair Artist — Hair Artist in Surrey, BC");
    expect(metadata.robots).toEqual({ index: false, follow: true });
  });
});
