import type { Metadata } from "next";
import { Suspense } from "react";

import { ManageBooking } from "@/components/booking/ManageBooking";
import { ManageBookingSkeleton } from "@/components/booking/ManageBookingSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { getSiteSettings } from "@/lib/content/get";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export const metadata: Metadata = {
  title: "Your Booking",
  robots: { index: false, follow: false },
};

/** Reads the booking id and signed token (request data) inside Suspense. */
async function ManageBookingLoader({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ id }, query, settings] = await Promise.all([params, searchParams, getSiteSettings()]);
  const token = typeof query.token === "string" ? query.token : "";

  return (
    <ManageBooking
      key={`${id}:${token}`}
      bookingId={id}
      token={token}
      contact={{ email: settings.email, phone: settings.phone }}
    />
  );
}

export default function ManageBookingPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  return (
    <>
      <PageHeader
        eyebrow="Manage booking"
        title="Your Booking"
        intro="Check your appointment details, add it to your calendar or cancel if your plans change. All times are in Pacific Time."
      />
      <div className="container-site pb-20 pt-10 sm:pb-24 sm:pt-14">
        <Suspense fallback={<ManageBookingSkeleton />}>
          <ManageBookingLoader params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </>
  );
}
