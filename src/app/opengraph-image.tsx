import { readFile } from "node:fs/promises";
import { join } from "node:path";

import { ImageResponse } from "next/og";

import { fallbackSiteSettings, localImages } from "@/lib/content/fallback";
import {
  BRAND_INK,
  BRAND_PAPER,
  BRAND_SMOKE,
  OG_IMAGE_ALT,
  OG_IMAGE_SIZE,
} from "@/lib/seo/constants";
import { BLACKLETTER, LABEL, blackletterFontOption, labelFontOption } from "@/lib/seo/og-fonts";

/**
 * Default social share card (1200×630) for every page: brand name in
 * blackletter beside one of Garry's photos. Static — generated once at build
 * time from local files, so it never depends on the CMS being reachable.
 */

export const alt = OG_IMAGE_ALT;
export const size = OG_IMAGE_SIZE;
export const contentType = "image/png";

const photo = localImages.silverWaves;
const photoData = await readFile(join(process.cwd(), "public", photo.src));
const photoSrc = `data:image/jpeg;base64,${photoData.toString("base64")}`;

const PHOTO_WIDTH = 440;
const GAP = 6;

const { businessName, address } = fallbackSiteSettings;
const location = `${address.city}, ${address.region}`;
// "Garry Hair Artist" → ["Garry", "Hair Artist"]: first word on its own line.
const [firstWord, ...rest] = businessName.split(" ");
const titleLines = rest.length ? [firstWord, rest.join(" ")] : [businessName];

const label = {
  fontFamily: LABEL,
  fontSize: 20,
  letterSpacing: 5,
  textTransform: "uppercase",
} as const;

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: BRAND_INK,
          color: BRAND_PAPER,
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "52px 60px 56px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", fontFamily: BLACKLETTER, fontSize: 52, lineHeight: 1 }}>
              <span>G</span>
              <span style={{ marginLeft: -2 }}>H</span>
            </div>
            <span style={{ ...label, fontSize: 16, color: BRAND_SMOKE }}>By appointment</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column" }}>
            {titleLines.map((line) => (
              <div
                key={line}
                style={{ display: "flex", fontFamily: BLACKLETTER, fontSize: 112, lineHeight: 1.02 }}
              >
                {line}
              </div>
            ))}
            <div style={{ ...label, display: "flex", marginTop: 30, color: BRAND_SMOKE }}>
              {`Hair Artist · ${location}`}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              borderTop: `1px dashed ${BRAND_SMOKE}`,
              paddingTop: 26,
            }}
          >
            <span style={{ ...label, textDecoration: "underline" }}>Book online  ›</span>
            <span style={{ ...label, fontSize: 16, color: BRAND_SMOKE }}>Cut · Colour · Care</span>
          </div>
        </div>

        <div style={{ display: "flex", paddingLeft: GAP }}>
          <img
            src={photoSrc}
            alt={photo.alt}
            width={PHOTO_WIDTH}
            height={OG_IMAGE_SIZE.height}
            style={{ objectFit: "cover", objectPosition: "50% 35%" }}
          />
        </div>
      </div>
    ),
    { ...OG_IMAGE_SIZE, fonts: [blackletterFontOption, labelFontOption] },
  );
}
