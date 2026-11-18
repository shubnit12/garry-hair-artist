import { afterEach, describe, expect, it, vi } from "vitest";

import { SERVICES_QUERY } from "@/lib/sanity/queries";

import { getServices } from "./get";
import { fallbackServices } from "./fallback";

const fetch = vi.hoisted(() => vi.fn());

vi.mock("next/cache", () => ({ cacheLife: vi.fn(), cacheTag: vi.fn() }));
vi.mock("@/lib/sanity/client", () => ({ contentClient: { fetch }, liveClient: null, writeClient: null }));

afterEach(() => {
  fetch.mockReset();
  vi.restoreAllMocks();
});

describe("cached content getters", () => {
  it("never accept a stale API CDN response", async () => {
    fetch.mockResolvedValue([{ id: "s1", name: "Haircut", slug: "haircut", durationMinutes: 45 }]);
    expect(await getServices()).toMatchObject([{ slug: "haircut", durationMinutes: 45 }]);
    expect(fetch).toHaveBeenCalledWith(SERVICES_QUERY, {}, { cacheMode: "noStale" });
  });

  it("show the built-in content when Sanity cannot be read (display only)", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    fetch.mockRejectedValue(new Error("Service Unavailable"));
    expect(await getServices()).toEqual(fallbackServices);
  });
});
