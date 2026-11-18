import type {
  OpeningHours,
  Service,
  SiteSettings,
  Weekday,
} from "@/lib/content/types";
import { BOOK_HREF, CURRENCY } from "@/lib/site";

/**
 * schema.org structured data (JSON-LD) describing the business.
 *
 * Pure functions only — the server component in
 * components/seo/LocalBusinessJsonLd.tsx feeds them cached content. Every value
 * comes from editable content; nothing about the business is invented here.
 */

export type JsonLd = { [key: string]: unknown };

export type LocalBusinessInput = {
  /** Canonical origin without a trailing slash, e.g. https://garryhairartist.com */
  siteUrl: string;
  settings: SiteSettings;
  weeklyHours: OpeningHours[];
  services: Service[];
  /** Absolute URLs of images that represent the business (share card, photos). */
  images: string[];
  /** Absolute URL of a square logo (min 112×112 for Google). */
  logoUrl: string;
};

const DAY_NAMES: Record<Weekday, string> = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
};

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Removes undefined, null, empty strings and empty arrays so the output stays tidy. */
function compact<T extends JsonLd>(node: T): T {
  return Object.fromEntries(
    Object.entries(node).filter(([, value]) => {
      if (value === undefined || value === null) return false;
      if (typeof value === "string") return value.trim().length > 0;
      if (Array.isArray(value)) return value.length > 0;
      return true;
    }),
  ) as T;
}

/** "Canada" / "CA" → ISO 3166-1 alpha-2 "CA"; anything else is passed through. */
export function toCountryCode(country: string): string {
  const value = country.trim();
  return /^(ca|can|canada)$/i.test(value) ? "CA" : value;
}

/**
 * Weekly hours → OpeningHoursSpecification, merging days that share the same
 * hours. Closed days (and days with invalid times) are omitted, which
 * schema.org reads as "closed".
 */
export function toOpeningHoursSpecification(week: OpeningHours[]): JsonLd[] {
  const groups = new Map<string, Weekday[]>();
  for (const day of week) {
    if (day.closed || !TIME.test(day.open) || !TIME.test(day.close) || day.open >= day.close) continue;
    const key = `${day.open}|${day.close}`;
    const days = groups.get(key) ?? [];
    if (!days.includes(day.day)) days.push(day.day);
    groups.set(key, days);
  }
  return Array.from(groups, ([key, days]) => {
    const [opens, closes] = key.split("|");
    return {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: days.map((day) => DAY_NAMES[day]),
      opens,
      closes,
    };
  });
}

/**
 * One Offer per service. Fixed prices use `price`; "From $90" prices use a
 * PriceSpecification with `minPrice`; services without a numeric price (e.g. a
 * complimentary consultation) are listed without a price.
 */
export function toOffer(service: Service, siteUrl: string): JsonLd {
  const hasPrice = typeof service.price === "number" && Number.isFinite(service.price);
  return compact({
    "@type": "Offer",
    url: service.bookable
      ? `${siteUrl}${BOOK_HREF}?service=${encodeURIComponent(service.slug)}`
      : `${siteUrl}/services`,
    itemOffered: compact({
      "@type": "Service",
      name: service.name,
      description: service.summary,
      serviceType: service.name,
    }),
    ...(hasPrice
      ? service.priceFrom
        ? {
            priceCurrency: CURRENCY,
            priceSpecification: {
              "@type": "PriceSpecification",
              minPrice: service.price,
              priceCurrency: CURRENCY,
            },
          }
        : { price: service.price, priceCurrency: CURRENCY }
      : {}),
  });
}

/** Google Maps search link for the business location. */
function mapUrl(query: string) {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

/**
 * The full JSON-LD graph: a WebSite node (helps Google show the site name) and
 * a HairSalon node with contact details, hours, services and booking action.
 */
export function buildLocalBusinessJsonLd(input: LocalBusinessInput): JsonLd {
  const { siteUrl, settings, weeklyHours, services, images, logoUrl } = input;
  const businessId = `${siteUrl}/#business`;
  const { address } = settings;
  const city = [address.city, address.region].filter(Boolean).join(", ");

  const sameAs = Object.values(settings.social).filter(
    (href): href is string => typeof href === "string" && /^https:\/\//.test(href),
  );

  const website = compact({
    "@type": "WebSite",
    "@id": `${siteUrl}/#website`,
    url: siteUrl,
    name: settings.businessName,
    alternateName: settings.shortName !== settings.businessName ? settings.shortName : undefined,
    description: settings.description,
    inLanguage: "en-CA",
    publisher: { "@id": businessId },
  });

  const business = compact({
    "@type": "HairSalon",
    "@id": businessId,
    name: settings.businessName,
    description: settings.description,
    slogan: settings.tagline,
    url: siteUrl,
    image: Array.from(new Set(images)),
    logo: { "@type": "ImageObject", url: logoUrl, width: 180, height: 180 },
    email: settings.email,
    telephone: settings.phone,
    address: compact({
      "@type": "PostalAddress",
      streetAddress: address.street,
      addressLocality: address.city,
      addressRegion: address.region,
      postalCode: address.postalCode,
      addressCountry: toCountryCode(address.country),
    }),
    hasMap: settings.mapQuery ? mapUrl(settings.mapQuery) : undefined,
    areaServed: [
      ...(city ? [{ "@type": "City", name: city }] : []),
      { "@type": "AdministrativeArea", name: "Metro Vancouver, BC" },
    ],
    openingHoursSpecification: toOpeningHoursSpecification(weeklyHours),
    sameAs,
    priceRange: "$$",
    currenciesAccepted: CURRENCY,
    hasOfferCatalog: services.length
      ? {
          "@type": "OfferCatalog",
          name: "Hair services",
          itemListElement: services.map((service) => toOffer(service, siteUrl)),
        }
      : undefined,
    potentialAction: {
      "@type": "ReserveAction",
      name: "Book an appointment",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${siteUrl}${BOOK_HREF}`,
        inLanguage: "en-CA",
        actionPlatform: [
          "https://schema.org/DesktopWebPlatform",
          "https://schema.org/MobileWebPlatform",
        ],
      },
      result: { "@type": "Reservation", name: "Hair appointment" },
    },
  });

  return { "@context": "https://schema.org", "@graph": [website, business] };
}

/**
 * JSON.stringify for an inline <script type="application/ld+json">. Escapes
 * characters that could close the script tag or break HTML parsing (per the
 * Next.js JSON-LD guide), so editor-supplied text can never inject markup.
 */
export function serializeJsonLd(data: unknown): string {
  return JSON.stringify(data)
    .replace(/</g, "\\u003c")
    .replace(/>/g, "\\u003e")
    .replace(/&/g, "\\u0026");
}
