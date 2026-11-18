import { describe, expect, it } from "vitest";

import { isTokenSecretConfigured, signBookingToken, verifyBookingToken } from "./tokens";

const SECRET = "test-secret-with-enough-entropy";
const ID = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("booking tokens", () => {
  it("signs deterministically as base64url HMAC-SHA256", () => {
    const token = signBookingToken(ID, SECRET);
    expect(token).toBe(signBookingToken(ID, SECRET));
    expect(token).toMatch(/^[A-Za-z0-9_-]{43}$/); // 32 bytes, unpadded
  });

  it("verifies a genuine token", () => {
    expect(verifyBookingToken(ID, signBookingToken(ID, SECRET), SECRET)).toBe(true);
  });

  it("rejects a tampered token", () => {
    const token = signBookingToken(ID, SECRET);
    const tampered = `${token[0] === "A" ? "B" : "A"}${token.slice(1)}`;
    expect(verifyBookingToken(ID, tampered, SECRET)).toBe(false);
  });

  it("rejects tokens of the wrong length without throwing", () => {
    const token = signBookingToken(ID, SECRET);
    expect(verifyBookingToken(ID, token.slice(0, -1), SECRET)).toBe(false);
    expect(verifyBookingToken(ID, `${token}A`, SECRET)).toBe(false);
    expect(verifyBookingToken(ID, "é".repeat(43), SECRET)).toBe(false);
  });

  it("rejects a token for another booking or signed with another secret", () => {
    expect(verifyBookingToken("another-id", signBookingToken(ID, SECRET), SECRET)).toBe(false);
    expect(verifyBookingToken(ID, signBookingToken(ID, "other-secret"), SECRET)).toBe(false);
  });

  it("rejects missing tokens and refuses to work without a secret", () => {
    expect(verifyBookingToken(ID, null, SECRET)).toBe(false);
    expect(verifyBookingToken(ID, "", SECRET)).toBe(false);
    expect(verifyBookingToken(ID, signBookingToken(ID, SECRET), "")).toBe(false);
    expect(() => signBookingToken(ID, "")).toThrow();
    expect(isTokenSecretConfigured("")).toBe(false);
    expect(isTokenSecretConfigured(SECRET)).toBe(true);
  });
});
