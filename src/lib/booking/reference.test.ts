import { describe, expect, it } from "vitest";

import { REFERENCE_RE, generateReference, referenceFromId } from "./reference";

describe("booking references", () => {
  it("generates GH- prefixed Crockford base32 codes", () => {
    for (let index = 0; index < 500; index++) {
      const reference = generateReference();
      expect(reference).toMatch(REFERENCE_RE);
      expect(reference).not.toMatch(/[ILOU]/);
    }
  });

  it("is random enough that collisions are rare", () => {
    const seen = new Set(Array.from({ length: 2000 }, generateReference));
    expect(seen.size).toBeGreaterThan(1990);
  });

  it("derives a stable, valid fallback from a document id", () => {
    const reference = referenceFromId("a1b2c3d4-e5f6-7890-abcd-ef1234567890");
    expect(reference).toBe("GH-A1B2C");
    expect(reference).toMatch(REFERENCE_RE);
    expect(referenceFromId("a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe(reference);
    expect(referenceFromId("lil")).toMatch(REFERENCE_RE);
  });

  it("ignores the private-path prefix of Studio booking ids", () => {
    expect(referenceFromId("booking.a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("GH-A1B2C");
    expect(referenceFromId("drafts.booking.a1b2c3d4-e5f6-7890-abcd-ef1234567890")).toBe("GH-A1B2C");
    // Different bookings get different codes (the prefix used to make them all "GH-BKNG…").
    const codes = new Set(
      ["0f8fad5b-d9cb", "7c9e6679-7425", "e4eaaaf2-d142", "16fd2706-8baf", "9b2e1c4d-3a5f"].map((uuid) =>
        referenceFromId(`booking.${uuid}`),
      ),
    );
    expect(codes.size).toBe(5);
  });
});
