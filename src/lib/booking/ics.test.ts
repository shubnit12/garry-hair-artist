import { describe, expect, it } from "vitest";

import { buildBookingIcs, escapeIcsText, foldIcsLine, formatIcsDate } from "./ics";

const base = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  reference: "GH-7K2P9",
  status: "confirmed" as const,
  serviceName: "Haircut",
  start: "2026-11-07T22:30:00.000Z",
  end: "2026-11-07T23:30:00.000Z",
  location: "Surrey, BC, Canada",
  manageUrl: "https://garryhairartist.com/booking/0f8fad5b-d9cb-469f-a165-70867728950e?token=abcDEF_-123",
  now: new Date("2026-10-31T12:00:00.000Z"),
  siteUrl: "https://garryhairartist.com",
};

/** RFC 5545 unfolding: remove CRLF followed by a single space. */
const unfold = (ics: string) => ics.replace(/\r\n /g, "");

describe("ics helpers", () => {
  it("escapes TEXT values", () => {
    expect(escapeIcsText("a\\b;c,d\ne\r\nf")).toBe("a\\\\b\\;c\\,d\\ne\\nf");
  });

  it("formats UTC timestamps", () => {
    expect(formatIcsDate("2026-11-07T22:30:00.000Z")).toBe("20261107T223000Z");
    expect(formatIcsDate(new Date(Date.UTC(2027, 0, 2, 3, 4, 5)))).toBe("20270102T030405Z");
  });

  it("leaves short lines alone", () => {
    expect(foldIcsLine("SUMMARY:Haircut")).toBe("SUMMARY:Haircut");
  });

  it("folds long lines at 75 octets without splitting multi-byte characters", () => {
    const line = `DESCRIPTION:${"Coupe à la mode — très élégant ✂️ ".repeat(8)}`;
    const folded = foldIcsLine(line);
    const physical = folded.split("\r\n");
    expect(physical.length).toBeGreaterThan(1);
    for (const [index, part] of physical.entries()) {
      expect(Buffer.byteLength(part, "utf8")).toBeLessThanOrEqual(75);
      if (index > 0) expect(part.startsWith(" ")).toBe(true);
      expect(part).not.toContain("�");
    }
    expect(unfold(folded)).toBe(line);
  });
});

describe("buildBookingIcs", () => {
  const ics = buildBookingIcs(base);

  it("uses CRLF line endings only and ends with CRLF", () => {
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
    for (const line of ics.split("\r\n")) expect(Buffer.byteLength(line, "utf8")).toBeLessThanOrEqual(75);
  });

  it("describes the appointment", () => {
    const lines = unfold(ics).split("\r\n");
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("VERSION:2.0");
    expect(lines).toContain("METHOD:PUBLISH");
    expect(lines).toContain(`UID:${base.id}@garryhairartist.com`);
    expect(lines).toContain("DTSTAMP:20261031T120000Z");
    expect(lines).toContain("DTSTART:20261107T223000Z");
    expect(lines).toContain("DTEND:20261107T233000Z");
    expect(lines).toContain("SUMMARY:Haircut with Garry Hair Artist");
    expect(lines).toContain("LOCATION:Surrey\\, BC\\, Canada");
    expect(lines).toContain("STATUS:CONFIRMED");
    expect(lines).toContain(`URL:${base.manageUrl}`);
    const description = lines.find((line) => line.startsWith("DESCRIPTION:"));
    expect(description).toBe(
      `DESCRIPTION:Booking reference: GH-7K2P9\\nManage or cancel your booking: ${base.manageUrl}`,
    );
    expect(lines.filter((line) => line === "BEGIN:VEVENT")).toHaveLength(1);
    expect(lines.at(-2)).toBe("END:VCALENDAR");
  });

  it("maps booking status to calendar status with an increasing sequence", () => {
    const pending = unfold(buildBookingIcs({ ...base, status: "pending" }));
    const cancelled = unfold(buildBookingIcs({ ...base, status: "cancelled" }));
    expect(pending).toContain("STATUS:TENTATIVE\r\nSEQUENCE:0");
    expect(unfold(ics)).toContain("STATUS:CONFIRMED\r\nSEQUENCE:1");
    expect(cancelled).toContain("STATUS:CANCELLED\r\nSEQUENCE:2");
  });

  it("escapes user-facing text such as service names and owner descriptions", () => {
    const custom = unfold(
      buildBookingIcs({
        ...base,
        serviceName: "Cut, colour; gloss",
        summary: undefined,
        description: "Client: Jane; Doe\nNotes: a, b",
      }),
    );
    expect(custom).toContain("SUMMARY:Cut\\, colour\\; gloss with Garry Hair Artist");
    expect(custom).toContain("DESCRIPTION:Client: Jane\\; Doe\\nNotes: a\\, b");
  });
});
