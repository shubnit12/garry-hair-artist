import { describe, expect, it } from "vitest";

import { bookingRequestSchema, looksLikeLinkOrMarkup } from "./schema";

const request = {
  serviceSlug: "haircut",
  date: "2026-11-10",
  time: "14:00",
  name: "Jane Doe",
  email: "jane@example.com",
  phone: "604 555 0100",
  consent: true,
};

describe("booking name validation", () => {
  it("accepts ordinary names", () => {
    for (const name of ["Jane Doe", "Mary-Jane O'Neil", "Dr. A.J. Smith Jr.", "Zoë Ñúñez", "李小龍", "Jean-Luc d’Arc"]) {
      expect(looksLikeLinkOrMarkup(name), name).toBe(false);
      expect(bookingRequestSchema.safeParse({ ...request, name }).success, name).toBe(true);
    }
  });

  it("rejects links, addresses and markup", () => {
    for (const name of [
      "https://phish.example/claim-your-prize Victim",
      "www.example Victim",
      "phish.example Victim",
      "Win at evil.co",
      "victim@example.com",
      "Jane <b>Doe</b>",
      "Jane\nDoe",
    ]) {
      expect(looksLikeLinkOrMarkup(name), name).toBe(true);
      const parsed = bookingRequestSchema.safeParse({ ...request, name });
      expect(parsed.success, name).toBe(false);
      expect(parsed.error?.issues[0]?.path).toEqual(["name"]);
    }
  });
});
