import { describe, expect, it } from "vitest";

import {
  bookingIdFromSlug,
  bookingSlug,
  isBookingId,
  isPrivateDocumentId,
  newPrivateId,
  PRIVATE_DOCUMENT_TYPES,
} from "./private-ids";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

describe("newPrivateId", () => {
  it("puts a fresh UUID under the type's private path", () => {
    const id = newPrivateId("booking");
    expect(id.startsWith("booking.")).toBe(true);
    expect(id.slice("booking.".length)).toMatch(UUID);
    expect(newPrivateId("booking")).not.toBe(id);
    expect(newPrivateId("contactMessage")).toMatch(/^contactMessage\./);
  });

  it("stays within Sanity's id rules (≤128 chars, a-zA-Z0-9._-)", () => {
    for (const type of PRIVATE_DOCUMENT_TYPES) {
      const id = newPrivateId(type as "booking" | "contactMessage");
      expect(id.length).toBeLessThanOrEqual(128);
      expect(id).toMatch(/^[a-zA-Z0-9][a-zA-Z0-9._-]*$/);
      expect(id).not.toMatch(/\.\./);
    }
  });
});

describe("isPrivateDocumentId", () => {
  it("accepts private ids and their drafts or versions", () => {
    expect(isPrivateDocumentId("booking", "booking.abc")).toBe(true);
    expect(isPrivateDocumentId("booking", "drafts.booking.abc")).toBe(true);
    expect(isPrivateDocumentId("booking", "versions.spring.booking.abc")).toBe(true);
  });

  it("rejects public ids, other types and a bare prefix", () => {
    expect(isPrivateDocumentId("booking", "3f2c6a1e-0000-4000-8000-000000000000")).toBe(false);
    expect(isPrivateDocumentId("booking", "drafts.3f2c6a1e")).toBe(false);
    expect(isPrivateDocumentId("booking", "contactMessage.abc")).toBe(false);
    expect(isPrivateDocumentId("booking", "booking.")).toBe(false);
    expect(isPrivateDocumentId("booking", undefined)).toBe(false);
  });
});

describe("booking ids in URLs", () => {
  it("round-trips between the document id and the bare UUID", () => {
    const id = newPrivateId("booking");
    const slug = bookingSlug(id);
    expect(slug).toMatch(UUID);
    expect(bookingIdFromSlug(slug)).toBe(id);
    expect(bookingIdFromSlug(id)).toBe(id);
  });

  it("only treats published private booking ids as bookings", () => {
    expect(isBookingId(newPrivateId("booking"))).toBe(true);
    expect(isBookingId("booking.studio-walk-in_1")).toBe(true);
    expect(isBookingId("3f2c6a1e-0000-4000-8000-000000000000")).toBe(false);
    expect(isBookingId("drafts.booking.abc")).toBe(false);
    expect(isBookingId("booking.")).toBe(false);
    expect(isBookingId("booking.a.b")).toBe(false);
    expect(isBookingId("bookingDayLock.2026-11-10")).toBe(false);
    expect(isBookingId(`booking.${"a".repeat(121)}`)).toBe(false);
  });
});
