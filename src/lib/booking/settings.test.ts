import { afterEach, describe, expect, it, vi } from "vitest";

import { fallbackBookingSettings } from "@/lib/content/fallback";
import { BOOKING_SETTINGS_QUERY } from "@/lib/sanity/queries";

import { getDayAvailability } from "./availability-service";
import { BookingError } from "./errors";
import { getLiveBookingSettings, getLiveService } from "./settings";
import { SERVICE_BY_SLUG_QUERY } from "./store/queries";

const sanity = vi.hoisted(() => ({ liveClient: null as { fetch: (...args: unknown[]) => Promise<unknown> } | null }));

vi.mock("@/lib/sanity/client", () => ({
  contentClient: null,
  writeClient: null,
  get liveClient() {
    return sanity.liveClient;
  },
}));

function connect(fetch: (query: string, params: Record<string, unknown>) => Promise<unknown>) {
  const spy = vi.fn(fetch);
  sanity.liveClient = { fetch: spy as (...args: unknown[]) => Promise<unknown> };
  return spy;
}

const expectUnavailable = (promise: Promise<unknown>) =>
  expect(promise).rejects.toMatchObject({ name: "BookingError", status: 503, code: "UNAVAILABLE" });

afterEach(() => {
  sanity.liveClient = null;
  vi.restoreAllMocks();
});

describe("live booking content", () => {
  it("uses the built-in defaults only while Sanity is not connected", async () => {
    expect(await getLiveBookingSettings()).toEqual(fallbackBookingSettings);
    expect(await getLiveService("haircut")).toMatchObject({ slug: "haircut", durationMinutes: 60, bookable: true });
    expect(await getLiveService("nope")).toBeUndefined();
  });

  it("reads the published service and settings, uncached", async () => {
    const fetch = connect(async (query) =>
      query === SERVICE_BY_SLUG_QUERY
        ? { id: "service-coloring", name: "Coloring", slug: "coloring", durationMinutes: 180, bookable: false }
        : { slotIntervalMinutes: 15, autoConfirm: false },
    );
    expect(await getLiveService("coloring")).toMatchObject({
      id: "service-coloring",
      durationMinutes: 180,
      bookable: false,
    });
    expect(await getLiveBookingSettings()).toMatchObject({ slotIntervalMinutes: 15, autoConfirm: false });
    expect(fetch).toHaveBeenCalledWith(SERVICE_BY_SLUG_QUERY, { slug: "coloring" }, { cache: "no-store" });
    expect(fetch).toHaveBeenCalledWith(BOOKING_SETTINGS_QUERY, {}, { cache: "no-store" });
  });

  it("never falls back to the built-in menu when Sanity has no such service", async () => {
    connect(async () => null);
    expect(await getLiveService("haircut")).toBeUndefined();
  });

  it("fails closed when Sanity is connected but cannot be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    connect(async () => {
      throw Object.assign(new Error("Service Unavailable"), { statusCode: 503 });
    });
    await expectUnavailable(getLiveService("haircut"));
    await expectUnavailable(getLiveBookingSettings());
    // …so availability is never computed from the defaults.
    const availability = getDayAvailability({ service: "haircut", date: "2026-11-10" }, new Date("2026-11-02T16:00:00Z"));
    await expect(availability).rejects.toBeInstanceOf(BookingError);
    await expectUnavailable(availability);
  });
});
