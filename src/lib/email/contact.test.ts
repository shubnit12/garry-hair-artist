import { describe, expect, it } from "vitest";

import { buildContactOwnerEmail, contactEmailSubject, GENERAL_TOPIC } from "./contact";

const base = {
  name: "Jamie Lee",
  email: "jamie@example.com",
  phone: "",
  topic: "Coloring",
  message: "Hi Garry,\nI'd love a soft balayage.",
  receivedAt: new Date("2026-10-31T19:30:00Z"),
  savedToStudio: true,
};

describe("contactEmailSubject", () => {
  it("includes the topic unless it is the general one", () => {
    expect(contactEmailSubject(base)).toBe("New message from Jamie Lee · Coloring");
    expect(contactEmailSubject({ ...base, topic: GENERAL_TOPIC })).toBe("New message from Jamie Lee");
    expect(contactEmailSubject({ ...base, topic: "" })).toBe("New message from Jamie Lee");
  });

  it("can never contain line breaks", () => {
    const subject = contactEmailSubject({ name: "Evil\r\nBcc: x@y.z", topic: "A\nB" });
    expect(subject).not.toMatch(/[\r\n]/);
  });
});

describe("buildContactOwnerEmail", () => {
  it("escapes user input in the HTML", () => {
    const email = buildContactOwnerEmail({
      ...base,
      name: `<img src=x onerror="alert(1)">`,
      message: "<script>alert('x')</script>",
    });
    expect(email.html).not.toContain("<script>");
    expect(email.html).not.toContain("<img src=x");
    expect(email.html).toContain("&lt;script&gt;");
  });

  it("keeps message line breaks and lists the details", () => {
    const email = buildContactOwnerEmail({ ...base, phone: "604-555-0100" });
    expect(email.html).toContain("Hi Garry,<br>I&#39;d love a soft balayage.");
    expect(email.html).toContain("604-555-0100");
    expect(email.html).toContain("mailto:jamie@example.com?subject=Re%3A%20Coloring");
    expect(email.text).toContain("Phone: 604-555-0100");
    expect(email.text).toContain("Hi Garry,\nI'd love a soft balayage.");
  });

  it("formats the received time in the business timezone", () => {
    // 19:30 UTC on Oct 31 is 12:30 PM PDT in Vancouver.
    expect(buildContactOwnerEmail(base).text).toMatch(/Received: .*12:30.*p\.?m\.?/i);
  });

  it("omits the phone row when no phone was given and mentions the Studio copy only when saved", () => {
    const saved = buildContactOwnerEmail(base);
    expect(saved.text).not.toContain("Phone:");
    expect(saved.text).toContain("saved in your Studio");
    expect(buildContactOwnerEmail({ ...base, savedToStudio: false }).text).not.toContain("saved in your Studio");
  });
});
