import type { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  create: vi.fn(),
  sendEmail: vi.fn(),
  hasWriteClient: true,
}));

vi.mock("@/lib/sanity/client", () => ({
  get writeClient() {
    return mocks.hasWriteClient ? { create: mocks.create } : null;
  },
}));
vi.mock("@/lib/email/send", () => ({ sendEmail: mocks.sendEmail }));
vi.mock("@/lib/email/recipients", () => ({ getOwnerRecipients: async () => ["owner@example.com"] }));

import { POST } from "./route";

let ipCounter = 0;

function post(body: unknown, { ip, headers = {} }: { ip?: string; headers?: Record<string, string> } = {}) {
  const raw = typeof body === "string" ? body : JSON.stringify(body);
  const request = new Request("http://localhost/api/contact", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": ip ?? `203.0.113.${++ipCounter}`,
      ...headers,
    },
    body: raw,
  });
  return POST(request as unknown as NextRequest);
}

const valid = () => ({
  name: "Jamie Lee",
  email: "Jamie@Example.com",
  phone: "",
  topic: "Coloring",
  message: "I'd love to book a soft balayage next month.",
  website: "",
  startedAt: Date.now() - 30_000,
});

let errorSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  mocks.hasWriteClient = true;
  mocks.create.mockReset().mockResolvedValue({ _id: "msg-1" });
  mocks.sendEmail.mockReset().mockResolvedValue({ ok: true, id: "email-1" });
  errorSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  errorSpy.mockRestore();
});

describe("POST /api/contact", () => {
  it("saves the message, emails the owner and returns ok", async () => {
    const response = await post(valid());
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: true });

    expect(mocks.create).toHaveBeenCalledTimes(1);
    const [document] = mocks.create.mock.calls[0];
    // Private path: hidden from unauthenticated reads of the public dataset.
    expect(document._id).toMatch(/^contactMessage\.[0-9a-f-]{36}$/);
    expect(document).toMatchObject({
      _type: "contactMessage",
      status: "new",
      name: "Jamie Lee",
      email: "jamie@example.com",
      topic: "Coloring",
    });
    expect(Number.isNaN(Date.parse(document.createdAt))).toBe(false);

    expect(mocks.sendEmail).toHaveBeenCalledTimes(1);
    const [email] = mocks.sendEmail.mock.calls[0];
    expect(email).toMatchObject({
      to: ["owner@example.com"],
      replyTo: "jamie@example.com",
      subject: "New message from Jamie Lee · Coloring",
      idempotencyKey: "contact-message/msg-1",
    });
    expect(email.text).toContain("soft balayage");
  });

  it("rejects non-JSON requests", async () => {
    const response = await post(valid(), { headers: { "content-type": "text/plain" } });
    expect(response.status).toBe(415);
    expect(await response.json()).toMatchObject({ error: "VALIDATION" });
  });

  it("rejects a JSON type smuggled into a CORS-safelisted content type", async () => {
    // Parses as text/plain, so a cross-site page could send it without a preflight.
    const response = await post(valid(), { headers: { "content-type": "text/plain; application/json" } });
    expect(response.status).toBe(415);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("accepts JSON content types with parameters or different casing", async () => {
    expect((await post(valid(), { headers: { "content-type": "application/json; charset=utf-8" } })).status).toBe(200);
    expect((await post(valid(), { headers: { "content-type": "Application/JSON" } })).status).toBe(200);
  });

  it("rejects cross-site submissions", async () => {
    const response = await post(valid(), {
      headers: { origin: "https://evil.example", "x-forwarded-host": "localhost" },
    });
    expect(response.status).toBe(403);
    expect(await response.json()).toMatchObject({ error: "FORBIDDEN" });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("accepts submissions from its own origin", async () => {
    const response = await post(valid(), {
      headers: { origin: "https://garry.example", "x-forwarded-host": "garry.example" },
    });
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("rejects invalid JSON", async () => {
    const response = await post("{not json");
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ error: "VALIDATION" });
  });

  it("rejects bodies over 10KB, even without a content-length header", async () => {
    const big = JSON.stringify({ ...valid(), message: "x".repeat(11 * 1024) });
    const declared = await post(big, { headers: { "content-length": String(big.length) } });
    expect(declared.status).toBe(413);

    const streamed = await POST(
      new Request("http://localhost/api/contact", {
        method: "POST",
        headers: { "content-type": "application/json", "x-forwarded-for": "198.51.100.200" },
        body: new Blob([big]).stream(),
        // @ts-expect-error -- Node's fetch needs `duplex` for streamed bodies; not in the DOM typings.
        duplex: "half",
      }) as unknown as NextRequest,
    );
    expect(streamed.status).toBe(413);
    expect(mocks.create).not.toHaveBeenCalled();
  });

  it("returns field errors for invalid input", async () => {
    const response = await post({ ...valid(), email: "nope", message: "short" });
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("VALIDATION");
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(["email", "message"]));
  });

  it("silently drops honeypot submissions without leaking the field", async () => {
    const response = await post({ ...valid(), website: "https://spam.example" });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("silently drops submissions sent too quickly after the form loaded", async () => {
    const response = await post({ ...valid(), startedAt: Date.now() - 300 });
    expect(response.status).toBe(200);
    expect(mocks.create).not.toHaveBeenCalled();
    expect(mocks.sendEmail).not.toHaveBeenCalled();
  });

  it("does not drop messages from visitors whose clock runs ahead", async () => {
    const response = await post({ ...valid(), startedAt: Date.now() + 5 * 60_000 });
    expect(response.status).toBe(200);
    expect(mocks.create).toHaveBeenCalledTimes(1);
  });

  it("rate limits repeated submissions from one IP", async () => {
    const ip = "192.0.2.77";
    for (let i = 0; i < 5; i++) expect((await post(valid(), { ip })).status).toBe(200);
    const limited = await post(valid(), { ip });
    expect(limited.status).toBe(429);
    expect(Number(limited.headers.get("retry-after"))).toBeGreaterThan(0);
    expect(await limited.json()).toMatchObject({ error: "RATE_LIMITED" });
  });

  it("succeeds with email only when Sanity is not configured", async () => {
    mocks.hasWriteClient = false;
    const response = await post(valid());
    expect(response.status).toBe(200);
    expect(mocks.sendEmail.mock.calls[0][0].idempotencyKey).toBeUndefined();
  });

  it("succeeds when saving works but the email fails", async () => {
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "Resend down" });
    expect((await post(valid())).status).toBe(200);
  });

  it("returns a short 503 when nothing could be delivered (the form adds the email fallback)", async () => {
    mocks.create.mockRejectedValue(new Error("Sanity down"));
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "Resend down" });
    const response = await post(valid());
    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "UNAVAILABLE",
      message: "Sorry — your message couldn't be sent right now.",
    });
  });

  it("never logs the message body or the provider's error text", async () => {
    mocks.create.mockRejectedValue(new Error("Sanity down"));
    mocks.sendEmail.mockResolvedValue({ ok: false, error: "Invalid recipient owner@example.com" });
    await post({ ...valid(), message: "SECRET-CONTENT that should stay private" });
    expect(errorSpy).toHaveBeenCalled();
    const logged = JSON.stringify(errorSpy.mock.calls);
    expect(logged).not.toContain("SECRET-CONTENT");
    expect(logged).not.toContain("owner@example.com");
  });
});
