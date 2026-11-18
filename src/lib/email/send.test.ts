import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { OutgoingEmail } from "./send";

const env = vi.hoisted(() => ({
  resendApiKey: "re_test",
  emailFrom: "Garry Hair Artist <hello@example.com>",
  isProduction: true,
}));
const resendSend = vi.hoisted(() => vi.fn());

vi.mock("@/lib/env.server", () => env);
vi.mock("resend", () => ({
  Resend: class {
    emails = { send: resendSend };
  },
}));

const email: OutgoingEmail = {
  to: "jane@example.com",
  subject: "New message from Jane Doe",
  html: "<p>Hi</p>",
  text: "Hi",
  idempotencyKey: "booking-1-client-confirmed",
};

async function loadSendEmail() {
  vi.resetModules();
  return (await import("./send")).sendEmail;
}

let logged: unknown[];

beforeEach(() => {
  env.resendApiKey = "re_test";
  resendSend.mockReset();
  logged = [];
  const capture = (...args: unknown[]) => void logged.push(...args);
  vi.spyOn(console, "error").mockImplementation(capture);
  vi.spyOn(console, "warn").mockImplementation(capture);
});

afterEach(() => {
  vi.restoreAllMocks();
});

/** Nothing personal (address, name, subject) or provider text reaches the logs. */
function expectNoPiiLogged() {
  const text = JSON.stringify(logged.map((value) => (value instanceof Error ? value.message : value)));
  expect(text).not.toMatch(/jane|Jane Doe|New message/i);
}

describe("sendEmail", () => {
  it("sends through Resend with the idempotency key", async () => {
    resendSend.mockResolvedValue({ data: { id: "email-1" }, error: null });
    const sendEmail = await loadSendEmail();
    expect(await sendEmail(email)).toEqual({ ok: true, id: "email-1" });
    expect(resendSend).toHaveBeenCalledWith(expect.objectContaining({ to: ["jane@example.com"] }), {
      idempotencyKey: "booking-1-client-confirmed",
    });
  });

  it("logs provider rejections and exceptions without personal data", async () => {
    resendSend.mockResolvedValueOnce({
      data: null,
      error: { name: "validation_error", statusCode: 422, message: "Invalid `to` field: jane@example.com" },
    });
    resendSend.mockRejectedValueOnce(new Error("socket hang up while sending to jane@example.com"));
    const sendEmail = await loadSendEmail();

    expect(await sendEmail(email)).toMatchObject({ ok: false });
    expect(await sendEmail(email)).toMatchObject({ ok: false });
    expect(logged).toContainEqual({ name: "validation_error", statusCode: 422 });
    expectNoPiiLogged();
  });

  it("does not log the subject when email is not configured in production", async () => {
    env.resendApiKey = "";
    const sendEmail = await loadSendEmail();
    expect(await sendEmail(email)).toEqual({ ok: false, error: "Email is not configured" });
    expect(logged.length).toBeGreaterThan(0);
    expectNoPiiLogged();
  });

  it("treats a reused idempotency key as already sent", async () => {
    resendSend.mockResolvedValue({
      data: null,
      error: { name: "invalid_idempotent_request", statusCode: 409, message: "Same key, different payload" },
    });
    const sendEmail = await loadSendEmail();
    expect(await sendEmail(email)).toEqual({ ok: true, id: "idempotent-replay" });
    expect(await sendEmail({ ...email, idempotencyKey: undefined })).toMatchObject({ ok: false });
  });
});
