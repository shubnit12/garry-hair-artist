import { describe, expect, it } from "vitest";

import type { Service } from "@/lib/content/types";

import { pickSignatureServices } from "./signature-services";

function service(slug: string, overrides: Partial<Service> = {}): Service {
  return {
    id: `service-${slug}`,
    name: slug,
    slug,
    category: "cut",
    summary: `${slug} summary`,
    durationMinutes: 60,
    price: 50,
    priceFrom: false,
    featured: false,
    bookable: true,
    order: 0,
    ...overrides,
  };
}

describe("pickSignatureServices", () => {
  it("returns featured services in their given order", () => {
    const result = pickSignatureServices([
      service("a"),
      service("b", { featured: true }),
      service("c"),
      service("d", { featured: true }),
    ]);
    expect(result.map((item) => item.slug)).toEqual(["b", "d"]);
  });

  it("caps the selection at three by default", () => {
    const result = pickSignatureServices(
      ["a", "b", "c", "d", "e"].map((slug) => service(slug, { featured: true })),
    );
    expect(result.map((item) => item.slug)).toEqual(["a", "b", "c"]);
  });

  it("falls back to the first bookable services when none are featured", () => {
    const result = pickSignatureServices([
      service("a", { bookable: false }),
      service("b"),
      service("c"),
      service("d"),
      service("e"),
    ]);
    expect(result.map((item) => item.slug)).toEqual(["b", "c", "d"]);
  });

  it("returns an empty list when nothing can be shown", () => {
    expect(pickSignatureServices([])).toEqual([]);
    expect(pickSignatureServices([service("a", { bookable: false })])).toEqual([]);
  });
});
