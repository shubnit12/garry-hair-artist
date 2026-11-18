import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const SECRET = "test-revalidate-secret";

const mocks = vi.hoisted(() => ({
  revalidateTag: vi.fn(),
  secret: "test-revalidate-secret",
}));

vi.mock("next/cache", () => ({ revalidateTag: mocks.revalidateTag }));
vi.mock("@/lib/env.server", () => ({
  get sanityRevalidateSecret() {
    return mocks.secret;
  },
}));
// Real signature verification, minus the 3 s eventual-consistency pause.
vi.mock("next-sanity/webhook", async (importOriginal) => {
  const actual = await importOriginal<typeof import("next-sanity/webhook")>();
  return {
    parseBody: (request: NextRequest, secret?: string) => actual.parseBody(request, secret, false),
  };
});

import { POST } from "./route";

async function post(body: unknown, { secret = SECRET, sign = true } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (sign) headers[SIGNATURE_HEADER_NAME] = await encodeSignatureHeader(raw, Date.now(), secret);
  const request = new Request("http://localhost/api/revalidate", { method: "POST", headers, body: raw });
  return POST(request as unknown as NextRequest);
}

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.secret = SECRET;
  mocks.revalidateTag.mockReset();
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("POST /api/revalidate", () => {
  it("expires the content cache and the document-type tag immediately", async () => {
    const response = await post({ _type: "service" });

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      revalidated: true,
      type: "service",
      tags: ["sanity-content", "service"],
    });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("sanity-content", { expire: 0 });
    expect(mocks.revalidateTag).toHaveBeenCalledWith("service", { expire: 0 });
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("revalidates all content when the projection has no _type", async () => {
    const response = await post({});

    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ revalidated: true, type: null, tags: ["sanity-content"] });
    expect(mocks.revalidateTag).toHaveBeenCalledTimes(1);
  });

  it.each(["booking", "timeOff", "contactMessage", "bookingDayLock"])(
    "skips %s documents",
    async (type) => {
      const response = await post({ _type: type });

      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ revalidated: false, skipped: true, type });
      expect(mocks.revalidateTag).not.toHaveBeenCalled();
    },
  );

  it("rejects unsigned requests", async () => {
    const response = await post({ _type: "service" }, { sign: false });

    expect(response.status).toBe(401);
    expect(await response.json()).toMatchObject({ error: "FORBIDDEN" });
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("rejects requests signed with the wrong secret", async () => {
    const response = await post({ _type: "service" }, { secret: "not-the-secret" });

    expect(response.status).toBe(401);
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });

  it("returns 400 for a signed body that is not JSON", async () => {
    const response = await post("not json");

    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "VALIDATION" });
  });

  it("returns 500 when the secret is not configured", async () => {
    mocks.secret = "";
    const response = await post({ _type: "service" });

    expect(response.status).toBe(500);
    expect(await response.json()).toMatchObject({ error: "SERVER" });
    expect(mocks.revalidateTag).not.toHaveBeenCalled();
  });
});
