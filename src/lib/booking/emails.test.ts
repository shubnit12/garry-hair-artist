import { describe, expect, it } from "vitest";

import {
  clientCancelled,
  clientConfirmation,
  clientConfirmedAfterPending,
  ownerCancelled,
  ownerNewBooking,
  type BookingEmailContext,
  type BookingEmailData,
} from "@/lib/email/booking";

const booking: BookingEmailData = {
  id: "0f8fad5b-d9cb-469f-a165-70867728950e",
  reference: "GH-7K2P9",
  status: "confirmed",
  serviceName: "Haircut",
  serviceSlug: "haircut",
  durationMinutes: 60,
  date: "2026-11-07",
  time: "14:30",
  customerName: `Jane <script>alert("x")</script> Doe`,
  customerEmail: "jane@example.com",
  customerPhone: "604 555 0100",
  notes: "Please use <b>sulfate-free</b> & fragrance-free products",
};

const context: BookingEmailContext = {
  siteUrl: "https://garryhairartist.com",
  businessName: "Garry Hair Artist",
  businessEmail: "hello@garryhair.com",
  location: "Surrey, BC, Canada",
  cancellationPolicy: "Please cancel at least 24 hours ahead.",
  manageUrl: "https://garryhairartist.com/booking/abc?token=t0k3n",
  calendarUrl: "https://garryhairartist.com/api/bookings/abc/calendar?token=t0k3n",
};

describe("booking email templates", () => {
  it("never renders user input as HTML", () => {
    for (const email of [
      ownerNewBooking(booking, context),
      clientConfirmation(booking, context),
      clientConfirmedAfterPending(booking, context),
      clientCancelled(booking, context, "owner"),
      ownerCancelled(booking, context),
    ]) {
      expect(email.html).not.toContain("<script>");
      expect(email.html).not.toContain("<b>sulfate-free</b>");
    }
    expect(ownerNewBooking(booking, context).html).toContain("&lt;b&gt;sulfate-free&lt;/b&gt; &amp; fragrance-free");
  });

  it("formats the owner's new-booking subject and links to the Studio", () => {
    const email = ownerNewBooking(booking, context);
    expect(email.subject).toBe("New booking: Haircut — Sat, Nov 7 at 2:30 PM");
    expect(email.text).toContain(
      "https://garryhairartist.com/studio/intent/edit/id=0f8fad5b-d9cb-469f-a165-70867728950e;type=booking",
    );
    expect(email.text).toContain("Phone: 604 555 0100");
    expect(email.text).toContain("Reference: GH-7K2P9");
  });

  it("words client confirmations by status and includes business-timezone details", () => {
    const confirmed = clientConfirmation(booking, context);
    expect(confirmed.html).toContain("You&#39;re booked");
    expect(confirmed.text).toContain("Date: Saturday, November 7, 2026");
    expect(confirmed.text).toContain("Time: 2:30 PM (Pacific Time)");
    expect(confirmed.text).toContain(`Manage or cancel: ${context.manageUrl}`);
    expect(confirmed.html).toContain(`href="${context.manageUrl}"`);

    const pending = clientConfirmation({ ...booking, status: "pending" }, context);
    expect(pending.text).toContain("Booking request received — Garry will confirm shortly");
    expect(pending.subject).toMatch(/^Booking request received/);
  });

  it("greets by first name, but never with a link-like name", () => {
    expect(clientConfirmation(booking, context).text).toContain("Hi Jane, thanks for booking");
    const linked = { ...booking, customerName: "https://phish.example/claim-your-prize Victim" };
    for (const email of [
      clientConfirmation(linked, context),
      clientConfirmedAfterPending(linked, context),
      clientCancelled(linked, context, "client"),
    ]) {
      expect(email.text).toContain("Hi there,");
      expect(email.text).not.toContain("phish.example");
      expect(email.html).not.toContain("phish.example");
    }
  });

  it("distinguishes client and owner cancellations and offers to book again", () => {
    const byClient = clientCancelled(booking, context, "client");
    const byOwner = clientCancelled(booking, context, "owner");
    expect(byClient.text).toContain("as requested");
    expect(byOwner.text).toContain("Garry is unable to keep your appointment");
    expect(byOwner.text).toContain("Book again: https://garryhairartist.com/book?service=haircut");
    expect(ownerCancelled(booking, context).subject).toBe("Cancelled: Haircut — Sat, Nov 7 at 2:30 PM");
  });
});
