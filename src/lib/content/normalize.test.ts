import { describe, expect, it } from "vitest";

import { fallbackAboutPage, fallbackHomePage } from "./fallback";
import { normaliseAboutPage, normaliseHomePage } from "./normalize";

const photo = (alt?: string) => ({
  alt,
  asset: { _id: "image-abc123-1200x1600-jpg", width: 1200, height: 1600 },
});

describe("replaceable portrait images", () => {
  it("never borrow the default photo's description for a new photo", () => {
    const about = normaliseAboutPage({ portrait: photo() });
    const home = normaliseHomePage({ aboutImage: photo("  ") });
    for (const image of [about.portrait, home.aboutImage]) {
      expect(image.src).toMatch(/^https:\/\/cdn\.sanity\.io\//);
      expect(image.alt).toBe("Garry, hair artist");
    }
  });

  it("use the editor's alt text when given", () => {
    expect(normaliseAboutPage({ portrait: photo("Garry styling a client's hair") }).portrait.alt).toBe(
      "Garry styling a client's hair",
    );
  });

  it("keep the default photo, with its own description, when none is uploaded", () => {
    expect(normaliseAboutPage({}).portrait).toEqual(fallbackAboutPage.portrait);
    expect(normaliseHomePage(null).aboutImage).toEqual(fallbackHomePage.aboutImage);
  });
});
