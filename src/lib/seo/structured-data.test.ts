import { describe, expect, it } from "vitest";

import {
  fallbackBookingSettings,
  fallbackServices,
  fallbackSiteSettings,
} from "@/lib/content/fallback";
import type { Service, SiteSettings } from "@/lib/content/types";

import {
  buildLocalBusinessJsonLd,
  serializeJsonLd,
  toCountryCode,
  toOffer,
  toOpeningHoursSpecification,
} from "./structured-data";

const SITE = "https://garryhairartist.com";

function build(settings: Partial<SiteSettings> = {}, services: Service[] = fallbackServices) {
  const graph = buildLocalBusinessJsonLd({
    siteUrl: SITE,
    settings: { ...fallbackSiteSettings, ...settings },
    weeklyHours: fallbackBookingSettings.weeklyHours,
    services,
    images: [`${SITE}/opengraph-image`, `${SITE}/opengraph-image`],
    logoUrl: `${SITE}/apple-icon`,
  });
  const [website, business] = graph["@graph"] as Record<string, unknown>[];
  return { graph, website, business };
}

describe("buildLocalBusinessJsonLd", () => {
  it("describes the business as a HairSalon linked to the website", () => {
    const { graph, website, business } = build();

    expect(graph["@context"]).toBe("https://schema.org");
    expect(website).toMatchObject({ "@type": "WebSite", url: SITE, publisher: { "@id": `${SITE}/#business` } });
    expect(business).toMatchObject({
      "@type": "HairSalon",
      "@id": `${SITE}/#business`,
      name: "Garry Hair Artist",
      url: SITE,
      email: fallbackSiteSettings.email,
      priceRange: "$$",
      image: [`${SITE}/opengraph-image`],
      address: {
        "@type": "PostalAddress",
        addressLocality: "Surrey",
        addressRegion: "BC",
        addressCountry: "CA",
      },
      potentialAction: { "@type": "ReserveAction", target: { urlTemplate: `${SITE}/book` } },
    });
  });

  it("omits contact details that are not set", () => {
    const { business } = build({ phone: undefined, social: {} });

    expect(business).not.toHaveProperty("telephone");
    expect(business).not.toHaveProperty("sameAs");
    expect(business.address).not.toHaveProperty("streetAddress");
    expect(business.address).not.toHaveProperty("postalCode");
  });

  it("includes phone, street address and https social profiles when set", () => {
    const { business } = build({
      phone: "+1 604 555 0100",
      address: { street: "123 Example St", city: "Surrey", region: "BC", postalCode: "V3T 0A1", country: "Canada" },
      social: { instagram: "https://instagram.com/example", facebook: "javascript:alert(1)" },
    });

    expect(business).toMatchObject({
      telephone: "+1 604 555 0100",
      address: { streetAddress: "123 Example St", postalCode: "V3T 0A1" },
      sameAs: ["https://instagram.com/example"],
    });
  });

  it("lists every service in the offer catalog", () => {
    const { business } = build();
    const catalog = business.hasOfferCatalog as { itemListElement: unknown[] };

    expect(catalog.itemListElement).toHaveLength(fallbackServices.length);
  });

  it("drops the offer catalog when there are no services", () => {
    expect(build({}, []).business).not.toHaveProperty("hasOfferCatalog");
  });
});

describe("toOpeningHoursSpecification", () => {
  it("skips closed days and merges days with identical hours", () => {
    expect(toOpeningHoursSpecification(fallbackBookingSettings.weeklyHours)).toEqual([
      {
        "@type": "OpeningHoursSpecification",
        dayOfWeek: ["Tuesday", "Wednesday", "Thursday", "Friday"],
        opens: "10:00",
        closes: "19:00",
      },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Saturday"], opens: "09:00", closes: "18:00" },
      { "@type": "OpeningHoursSpecification", dayOfWeek: ["Sunday"], opens: "11:00", closes: "17:00" },
    ]);
  });

  it("ignores invalid time ranges", () => {
    expect(
      toOpeningHoursSpecification([
        { day: "monday", closed: false, open: "19:00", close: "10:00" },
        { day: "tuesday", closed: false, open: "9am", close: "5pm" },
      ]),
    ).toEqual([]);
  });
});

describe("toOffer", () => {
  const base = fallbackServices.find((service) => service.slug === "haircut")!;

  it("uses minPrice for 'from' prices", () => {
    expect(toOffer({ ...base, price: 90, priceFrom: true }, SITE)).toMatchObject({
      url: `${SITE}/book?service=haircut`,
      priceCurrency: "CAD",
      priceSpecification: { "@type": "PriceSpecification", minPrice: 90, priceCurrency: "CAD" },
      itemOffered: { "@type": "Service", name: "Haircut" },
    });
  });

  it("uses price for fixed prices", () => {
    const offer = toOffer({ ...base, price: 45, priceFrom: false }, SITE);
    expect(offer).toMatchObject({ price: 45, priceCurrency: "CAD" });
    expect(offer).not.toHaveProperty("priceSpecification");
  });

  it("omits the price when there is none", () => {
    const offer = toOffer({ ...base, price: undefined, priceNote: "Complimentary" }, SITE);
    expect(offer).not.toHaveProperty("price");
    expect(offer).not.toHaveProperty("priceCurrency");
  });

  it("links services that cannot be booked online to the services page", () => {
    expect(toOffer({ ...base, bookable: false }, SITE)).toMatchObject({ url: `${SITE}/services` });
  });
});

describe("toCountryCode", () => {
  it.each([
    ["Canada", "CA"],
    ["CA", "CA"],
    [" canada ", "CA"],
    ["United States", "United States"],
  ])("%s → %s", (input, expected) => {
    expect(toCountryCode(input)).toBe(expected);
  });
});

describe("serializeJsonLd", () => {
  it("escapes characters that could break out of the script tag", () => {
    const json = serializeJsonLd({ name: "</script><script>alert('x')</script> & co" });

    expect(json).not.toMatch(/[<>&]/);
    expect(JSON.parse(json)).toEqual({ name: "</script><script>alert('x')</script> & co" });
  });
});
