import { rm } from "node:fs/promises";

import { encodeSignatureHeader, SIGNATURE_HEADER_NAME } from "@sanity/webhook";
import { NextRequest } from "next/server";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { GET as getAvailability } from "@/app/api/availability/route";
import { GET as getMonth } from "@/app/api/availability/month/route";
import { GET as getCalendar } from "@/app/api/bookings/[id]/calendar/route";
import { POST as cancelBooking } from "@/app/api/bookings/[id]/cancel/route";
import { GET as getBooking } from "@/app/api/bookings/[id]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as statusWebhook } from "@/app/api/webhooks/booking-status/route";
import { sendEmail } from "@/lib/email/send";
import { bookingSlug } from "@/lib/private-ids";

import { MESSAGES } from "./errors";
import { formatIcsDate } from "./ics";
import { getBookingStore } from "./store";
import { zonedToUtc } from "./time";
import { signBookingToken } from "./tokens";
import type { AvailabilityResponse, CreateBookingResponse, MonthAvailabilityResponse, PublicBooking } from "./types";

/**
 * End-to-end tests of the booking route handlers against the local JSON store
 * (in a temp file), with CMS content, Sanity clients and email mocked. With no
 * Sanity client, the booking engine uses the built-in services and settings.
 */

vi.mock("@/lib/content/get", async () => {
  const fallback = await import("@/lib/content/fallback");
  return {
    getSiteSettings: async () => fallback.fallbackSiteSettings,
    getBookingSettings: async () => fallback.fallbackBookingSettings,
  };
});
vi.mock("@/lib/sanity/client", () => ({ contentClient: null, liveClient: null, writeClient: null }));
vi.mock("@/lib/email/send", () => ({ sendEmail: vi.fn(async () => ({ ok: true, id: "test" })) }));
vi.mock("@/lib/email/recipients", () => ({ getOwnerRecipients: async () => ["owner@example.com"] }));
vi.mock("@/lib/env.server", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/env.server")>()),
  sanityWebhookSecret: "test-webhook-secret",
}));
// Real signature verification, minus the 3s eventual-consistency pause.
vi.mock("next-sanity/webhook", async (importOriginal) => {
  const real = await importOriginal<typeof import("next-sanity/webhook")>();
  return {
    ...real,
    parseBody: (req: NextRequest, secret?: string) => real.parseBody(req, secret, false),
  };
});
vi.mock("@/lib/booking/store", async (importOriginal) => {
  const { createLocalStore } = await import("@/lib/booking/store/local");
  const os = await import("node:os");
  const path = await import("node:path");
  const filePath = path.join(os.tmpdir(), `booking-api-test-${process.pid}-${Date.now()}.json`);
  const store = createLocalStore({ filePath });
  return {
    ...(await importOriginal<typeof import("@/lib/booking/store")>()),
    getBookingStore: () => store,
    testStorePath: filePath,
  };
});

const ORIGIN = "http://localhost:3000";
/** Monday 2026-11-02, 08:00 in Surrey (fallback settings: Tue–Fri 10:00–19:00, 2h notice). */
const NOW = zonedToUtc("2026-11-02", "08:00");
const DATE = "2026-11-10";

let ipCounter = 0;
const nextIp = () => `203.0.113.${++ipCounter}`;

function request(path: string, init: { method?: string; body?: unknown; headers?: Record<string, string> } = {}) {
  const body = init.body === undefined ? undefined : typeof init.body === "string" ? init.body : JSON.stringify(init.body);
  return new NextRequest(`${ORIGIN}${path}`, {
    method: init.method ?? "GET",
    body,
    headers: {
      host: "localhost:3000",
      "x-forwarded-for": nextIp(),
      ...(body ? { "content-type": "application/json", origin: ORIGIN } : {}),
      ...init.headers,
    },
  });
}

const params = (id: string) => ({ params: Promise.resolve({ id }) });

function bookingBody(overrides: Record<string, unknown> = {}) {
  return {
    serviceSlug: "haircut",
    date: DATE,
    time: "14:00",
    name: "Jane Doe",
    email: "Jane@Example.com",
    phone: "604 555 0100",
    notes: "First visit",
    consent: true,
    website: "",
    startedAt: NOW.getTime() - 60_000,
    ...overrides,
  };
}

async function slotStatus(time: string) {
  const response = await getAvailability(request(`/api/availability?service=haircut&date=${DATE}`));
  const body = (await response.json()) as AvailabilityResponse;
  return body.slots.find((slot) => slot.time === time)?.status;
}

const sendEmailMock = vi.mocked(sendEmail);

beforeAll(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(NOW);
});

beforeEach(() => {
  sendEmailMock.mockClear();
});

afterAll(async () => {
  vi.useRealTimers();
  const { testStorePath } = (await import("@/lib/booking/store")) as unknown as { testStorePath: string };
  await rm(testStorePath, { force: true });
});

describe("GET /api/availability", () => {
  it("returns the day's slots with no-store caching", async () => {
    const response = await getAvailability(request(`/api/availability?service=haircut&date=${DATE}`));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as AvailabilityResponse;
    expect(body).toMatchObject({
      date: DATE,
      timezone: "America/Vancouver",
      service: { slug: "haircut", name: "Haircut", durationMinutes: 60 },
      closed: false,
    });
    expect(body.slots).toHaveLength(17);
    expect(body.slots[0]).toEqual({ time: "10:00", start: zonedToUtc(DATE, "10:00").toISOString(), status: "available" });
  });

  it("validates the query and the service", async () => {
    const bad = await getAvailability(request("/api/availability?service=haircut&date=2026-02-30"));
    expect(bad.status).toBe(400);
    expect(await bad.json()).toMatchObject({ error: "VALIDATION" });

    const missing = await getAvailability(request("/api/availability?date=2026-11-10"));
    expect(missing.status).toBe(400);

    const unknown = await getAvailability(request(`/api/availability?service=balayage-deluxe&date=${DATE}`));
    expect(unknown.status).toBe(404);
    expect(await unknown.json()).toMatchObject({ error: "NOT_FOUND" });
  });

  it("rate limits bursts per IP", async () => {
    const headers = { "x-forwarded-for": "198.51.100.7" };
    let last: Response | undefined;
    for (let index = 0; index < 121; index++) {
      last = await getAvailability(request(`/api/availability?service=haircut&date=${DATE}`, { headers }));
    }
    expect(last!.status).toBe(429);
    expect(last!.headers.get("retry-after")).toMatch(/^\d+$/);
  });
});

describe("GET /api/availability/month", () => {
  it("summarises the month", async () => {
    const response = await getMonth(request("/api/availability/month?service=coloring&month=2026-11"));
    expect(response.status).toBe(200);
    const body = (await response.json()) as MonthAvailabilityResponse;
    expect(body.days).toHaveLength(30);
    expect(body.service.durationMinutes).toBe(150);
    expect(body.firstBookableDate).toBe("2026-11-02");
    expect(body.lastBookableDate).toBe("2027-01-01");
    const byDate = Object.fromEntries(body.days.map((day) => [day.date, day.status]));
    expect(byDate["2026-11-01"]).toBe("unavailable");
    expect(byDate["2026-11-02"]).toBe("closed");
    expect(byDate["2026-11-03"]).toBe("available");
  });

  it("rejects a malformed month", async () => {
    const response = await getMonth(request("/api/availability/month?service=haircut&month=2026-13"));
    expect(response.status).toBe(400);
  });
});

describe("booking lifecycle", () => {
  let booking: PublicBooking;
  let token: string;

  it("creates a booking, emails owner and client, and returns signed links", async () => {
    const response = await createBooking(request("/api/bookings", { method: "POST", body: bookingBody() }));
    expect(response.status).toBe(201);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = (await response.json()) as CreateBookingResponse;
    booking = body.booking;
    token = signBookingToken(booking.id);

    expect(body.emailSent).toBe(true);
    expect(body.message).toMatch(/confirmation/);
    expect(booking).toMatchObject({
      status: "confirmed",
      serviceSlug: "haircut",
      serviceName: "Haircut",
      durationMinutes: 60,
      date: DATE,
      time: "14:00",
      start: zonedToUtc(DATE, "14:00").toISOString(),
      end: zonedToUtc(DATE, "15:00").toISOString(),
      customerName: "Jane Doe",
    });
    expect(booking.reference).toMatch(/^GH-[0-9A-HJKMNP-TV-Z]{5}$/);
    // Saved under the private path; links carry only the bare UUID.
    expect(booking.id).toMatch(/^booking\.[0-9a-f-]{36}$/);
    const slug = bookingSlug(booking.id);
    expect(booking.manageUrl).toBe(`/booking/${slug}?token=${token}`);
    expect(booking.calendarUrl).toBe(`/api/bookings/${slug}/calendar?token=${token}`);
    expect(booking).not.toHaveProperty("customerEmail");

    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    const recipients = sendEmailMock.mock.calls.map(([email]) => email.to);
    expect(recipients).toEqual(expect.arrayContaining([["owner@example.com"], "jane@example.com"]));
    for (const [email] of sendEmailMock.mock.calls) {
      expect(email.attachments?.[0]?.filename).toBe(`garry-hair-artist-${booking.reference}.ics`);
      expect(email.idempotencyKey).toMatch(new RegExp(`^booking-${booking.id}-`));
    }
  });

  it("shows the slot as booked and blocks the clean-up buffer", async () => {
    expect(await slotStatus("14:00")).toBe("booked");
    expect(await slotStatus("14:30")).toBe("booked");
    expect(await slotStatus("15:00")).toBe("unavailable");
    expect(await slotStatus("15:30")).toBe("available");
  });

  it("refuses a second booking for the same time with 409 SLOT_TAKEN", async () => {
    const response = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ email: "other@example.com" }) }),
    );
    expect(response.status).toBe(409);
    expect(await response.json()).toEqual({
      error: "SLOT_TAKEN",
      message: "Sorry — that time was just booked. Please choose another time.",
    });
  });

  it("returns the booking for a valid signed link only", async () => {
    const ok = await getBooking(request(`/api/bookings/${booking.id}?token=${token}`), params(booking.id));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({
      booking: { id: booking.id, status: "confirmed" },
      canCancel: true,
      cancellationPolicy: expect.stringContaining("24 hours"),
    });

    const forged = await getBooking(request(`/api/bookings/${booking.id}?token=${"x".repeat(43)}`), params(booking.id));
    expect(forged.status).toBe(403);
    const noToken = await getBooking(request(`/api/bookings/${booking.id}`), params(booking.id));
    expect(noToken.status).toBe(403);

    // The bare UUID from an emailed link resolves to the same booking.
    const viaSlug = await getBooking(
      request(`/api/bookings/${bookingSlug(booking.id)}?token=${token}`),
      params(bookingSlug(booking.id)),
    );
    expect(viaSlug.status).toBe(200);

    const otherId = "booking.11111111-2222-4333-8444-555555555555";
    const missing = await getBooking(
      request(`/api/bookings/${bookingSlug(otherId)}?token=${signBookingToken(otherId)}`),
      params(bookingSlug(otherId)),
    );
    expect(missing.status).toBe(404);

    // Ids outside the private path are never looked up, even with a valid signature.
    const publicId = "drafts.booking.11111111-2222-4333-8444-555555555555";
    const outside = await getBooking(
      request(`/api/bookings/${publicId}?token=${signBookingToken(publicId)}`),
      params(publicId),
    );
    expect(outside.status).toBe(404);
  });

  it("serves the calendar file", async () => {
    const response = await getCalendar(request(`/api/bookings/${booking.id}/calendar?token=${token}`), params(booking.id));
    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("text/calendar; charset=utf-8");
    expect(response.headers.get("content-disposition")).toBe(
      `attachment; filename="garry-hair-artist-${booking.reference}.ics"`,
    );
    const ics = await response.text();
    expect(ics).toContain(`DTSTART:${formatIcsDate(zonedToUtc(DATE, "14:00"))}`);
    expect(ics).toContain("STATUS:CONFIRMED");

    const forbidden = await getCalendar(request(`/api/bookings/${booking.id}/calendar?token=nope`), params(booking.id));
    expect(forbidden.status).toBe(403);
  });

  it("lets the client cancel once, notifying both sides and freeing the slot", async () => {
    const response = await cancelBooking(
      request(`/api/bookings/${booking.id}/cancel`, { method: "POST", body: { token } }),
      params(booking.id),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ booking: { id: booking.id, status: "cancelled" } });
    expect(sendEmailMock).toHaveBeenCalledTimes(2);
    expect(await slotStatus("14:00")).toBe("available");

    const stored = await getBookingStore()!.getBooking(booking.id);
    expect(stored).toMatchObject({ status: "cancelled", cancelledBy: "client", notifiedStatus: "cancelled" });

    const again = await cancelBooking(
      request(`/api/bookings/${booking.id}/cancel`, { method: "POST", body: { token } }),
      params(booking.id),
    );
    expect(again.status).toBe(409);

    const view = await getBooking(request(`/api/bookings/${booking.id}?token=${token}`), params(booking.id));
    expect(await view.json()).toMatchObject({ canCancel: false });
  });
});

describe("POST /api/bookings guards", () => {
  it("rejects invalid input with field errors", async () => {
    const response = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ email: "nope", consent: false }) }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { error: string; fieldErrors: Record<string, string[]> };
    expect(body.error).toBe("VALIDATION");
    expect(Object.keys(body.fieldErrors)).toEqual(expect.arrayContaining(["email", "consent"]));
  });

  it("rejects times that are not offered", async () => {
    const response = await createBooking(request("/api/bookings", { method: "POST", body: bookingBody({ time: "10:15" }) }));
    expect(response.status).toBe(400);
    expect(await response.json()).toMatchObject({ message: "That time isn't offered — please choose another." });

    const closed = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ date: "2026-11-09", time: "12:00" }) }),
    );
    expect(closed.status).toBe(400);
  });

  it("only accepts times that are still bookable", async () => {
    const response = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ date: "2026-11-03", time: "10:00" }) }),
    );
    // Tuesday 10:00 is more than 2 hours away from Monday 08:00, so it is fine…
    expect(response.status).toBe(201);
    const late = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ date: "2026-11-01", time: "12:00" }) }),
    );
    // …but a past date never is.
    expect(late.status).toBe(409);
  });

  it("gives bots a generic error", async () => {
    const honeypot = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ website: "https://spam.example" }) }),
    );
    expect(honeypot.status).toBe(400);
    expect(await honeypot.json()).toEqual({
      error: "VALIDATION",
      message: "Something went wrong — please try again or contact us.",
    });

    const fast = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ startedAt: NOW.getTime() - 500 }) }),
    );
    expect(fast.status).toBe(400);
    expect(await fast.json()).toMatchObject({ message: "Please take a moment to review your details and submit again." });

    // A visitor whose clock runs ahead is not mistaken for a bot.
    const skewed = await createBooking(
      request("/api/bookings", {
        method: "POST",
        body: bookingBody({ time: "16:00", startedAt: NOW.getTime() + 5 * 60_000 }),
      }),
    );
    expect(skewed.status).toBe(201);
  });

  it("rejects malformed, oversized and cross-site requests", async () => {
    const malformed = await createBooking(request("/api/bookings", { method: "POST", body: "{not json" }));
    expect(malformed.status).toBe(400);

    const huge = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody({ notes: "x".repeat(11_000) }) }),
    );
    expect(huge.status).toBe(400);
    expect(await huge.json()).toMatchObject({ message: "That request is too large." });

    const crossSite = await createBooking(
      request("/api/bookings", { method: "POST", body: bookingBody(), headers: { origin: "https://evil.example" } }),
    );
    expect(crossSite.status).toBe(403);
  });

  it("rejects names that carry links or markup", async () => {
    const response = await createBooking(
      request("/api/bookings", {
        method: "POST",
        body: bookingBody({ name: "https://phish.example/claim-your-prize Victim", email: "victim@example.com" }),
      }),
    );
    expect(response.status).toBe(400);
    const body = (await response.json()) as { fieldErrors: Record<string, string[]> };
    expect(Object.keys(body.fieldErrors)).toEqual(["name"]);
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("caps upcoming online bookings per email address, without revealing anything about a phone number", async () => {
    const date = "2026-11-13";
    const client = { date, email: "cap@example.com", phone: "778 555 0199" };
    const book = (overrides: Record<string, unknown>) =>
      createBooking(request("/api/bookings", { method: "POST", body: bookingBody({ ...client, ...overrides }) }));

    expect((await book({ time: "10:00" })).status).toBe(201);
    expect((await book({ time: "12:00", email: "CAP@example.com" })).status).toBe(201);

    // Same email (any case), even with another phone number: capped.
    const capped = await book({ time: "14:00", email: "Cap@Example.com", phone: "604 555 0123" });
    expect(capped.status).toBe(429);
    expect(capped.headers.get("retry-after")).toBeNull();
    expect(await capped.json()).toEqual({ error: "RATE_LIMITED", message: MESSAGES.bookingLimit });
    // The same phone with another email books normally, so a known number can't be probed.
    expect((await book({ time: "14:00", email: "someone-else@example.com", phone: "+1 (778) 555-0199" })).status).toBe(201);
  });

  it("limits how many bookings (and so emails) one address can trigger per day", async () => {
    const body = bookingBody({ date: "2026-11-19", time: "11:00", email: "relay@example.com", phone: "604 555 0177" });
    for (let index = 0; index < 3; index++) {
      const created = await createBooking(request("/api/bookings", { method: "POST", body }));
      expect(created.status).toBe(201);
      const { booking: made } = (await created.json()) as CreateBookingResponse;
      const cancelled = await cancelBooking(
        request(`/api/bookings/${made.id}/cancel`, { method: "POST", body: { token: signBookingToken(made.id) } }),
        params(made.id),
      );
      expect(cancelled.status).toBe(200);
    }
    sendEmailMock.mockClear();

    const response = await createBooking(request("/api/bookings", { method: "POST", body }));
    expect(response.status).toBe(429);
    // Identical to the upcoming-appointments cap (no Retry-After either), so neither reveals which limit was hit.
    expect(response.headers.get("retry-after")).toBeNull();
    expect(await response.json()).toEqual({ error: "RATE_LIMITED", message: MESSAGES.bookingLimit });
    expect(sendEmailMock).not.toHaveBeenCalled();
  });

  it("rate limits booking attempts per IP", async () => {
    const headers = { "x-forwarded-for": "198.51.100.42" };
    const statuses: number[] = [];
    for (let index = 0; index < 6; index++) {
      const response = await createBooking(
        request("/api/bookings", { method: "POST", body: bookingBody({ time: "10:15" }), headers }),
      );
      statuses.push(response.status);
    }
    expect(statuses.slice(0, 5)).toEqual([400, 400, 400, 400, 400]);
    expect(statuses[5]).toBe(429);
  });
});

describe("POST /api/webhooks/booking-status", () => {
  async function signedRequest(payload: unknown) {
    const body = JSON.stringify(payload);
    const signature = await encodeSignatureHeader(body, Date.now(), "test-webhook-secret");
    return request("/api/webhooks/booking-status", {
      method: "POST",
      body,
      headers: { [SIGNATURE_HEADER_NAME]: signature },
    });
  }

  it("rejects unsigned and badly signed deliveries", async () => {
    const unsigned = await statusWebhook(request("/api/webhooks/booking-status", { method: "POST", body: { _id: "x" } }));
    expect(unsigned.status).toBe(401);
    const forged = await statusWebhook(
      request("/api/webhooks/booking-status", {
        method: "POST",
        body: { _id: "x" },
        headers: { [SIGNATURE_HEADER_NAME]: "t=1,v1=bad" },
      }),
    );
    expect(forged.status).toBe(401);
  });

  it("emails the client once per status change made in the Studio", async () => {
      const store = getBookingStore()!;
      const created = await store.createBooking(
        {
          id: "booking.33333333-4444-4555-8666-777777777777",
          reference: "GH-W3BH0",
          status: "pending",
          serviceSlug: "haircut",
          serviceName: "Haircut",
          durationMinutes: 60,
          date: "2026-11-12",
          time: "11:00",
          start: zonedToUtc("2026-11-12", "11:00").toISOString(),
          end: zonedToUtc("2026-11-12", "12:00").toISOString(),
          customerName: "Sam Lee",
          customerEmail: "sam@example.com",
          customerPhone: "604 555 0111",
          notes: "",
          source: "website",
          notifiedStatus: "pending",
        },
        () => true,
      );
      await store.updateBooking(created.id, () => ({ status: "confirmed" }));

      const first = await statusWebhook(await signedRequest({ _id: created.id }));
      expect(first.status).toBe(200);
      expect(await first.json()).toMatchObject({ ok: true, action: "client-confirmed-email" });
      expect(sendEmailMock).toHaveBeenCalledTimes(1);
      expect(sendEmailMock.mock.calls[0]![0].subject).toBe("Confirmed: Haircut on Thu, Nov 12 at 11:00 AM");
      // The .ics is stamped from the booking, not the delivery time, so a retry sends an identical payload.
      const ics = String(sendEmailMock.mock.calls[0]![0].attachments?.[0]?.content);
      expect(ics).toContain(`DTSTAMP:${formatIcsDate(zonedToUtc("2026-11-12", "11:00"))}`);
      expect(await store.getBooking(created.id)).toMatchObject({ notifiedStatus: "confirmed" });

      const repeat = await statusWebhook(await signedRequest({ _id: created.id }));
      expect(await repeat.json()).toMatchObject({ ok: true, action: "none" });
      expect(sendEmailMock).toHaveBeenCalledTimes(1);

      await store.updateBooking(created.id, () => ({ status: "cancelled" }));
      const cancelled = await statusWebhook(await signedRequest({ _id: created.id }));
      expect(await cancelled.json()).toMatchObject({ ok: true, action: "client-cancelled-email" });
      expect(sendEmailMock.mock.calls[1]![0].subject).toBe("Booking cancelled: Haircut on Thu, Nov 12 at 11:00 AM");
      expect(await store.getBooking(created.id)).toMatchObject({
        notifiedStatus: "cancelled",
        cancelledBy: "owner",
        cancelledAt: NOW.toISOString(),
      });
  });
});
