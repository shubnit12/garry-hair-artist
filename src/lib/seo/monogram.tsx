import "server-only";

import { ImageResponse } from "next/og";

import { BRAND_INK, BRAND_PAPER } from "./constants";
import { BLACKLETTER, blackletterFontOption } from "./og-fonts";

/**
 * Square "GH" blackletter monogram on the ink background — the same mark as
 * the header logo. Used for the favicon and the Apple touch icon.
 */
export function monogramImage(size: number): ImageResponse {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND_INK,
          color: BRAND_PAPER,
          fontFamily: BLACKLETTER,
          fontSize: Math.round(size * 0.66),
          lineHeight: 1,
          // Blackletter capitals sit high; nudge the pair onto the optical centre.
          paddingTop: Math.round(size * 0.06),
        }}
      >
        <span>G</span>
        <span style={{ marginLeft: -Math.round(size * 0.03) }}>H</span>
      </div>
    ),
    { width: size, height: size, fonts: [blackletterFontOption] },
  );
}
