import type { Metadata } from "next";
import { Suspense } from "react";

import { BookingWizard } from "@/components/booking/BookingWizard";
import { BookingWizardSkeleton } from "@/components/booking/BookingWizardSkeleton";
import type { BusinessContact, WizardService } from "@/components/booking/types";
import { PageHeader } from "@/components/ui/PageHeader";
import { getBookableServices, getBookingSettings, getSiteSettings } from "@/lib/content/get";
import type { Service } from "@/lib/content/types";
import { buildPageMetadata } from "@/lib/seo/metadata";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const TITLE = "Book an Appointment";

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const location = [settings.address.city, settings.address.region].filter(Boolean).join(", ");
  const description = `Book a haircut, colour or hair treatment with ${settings.shortName} in ${location}. Choose a service and a time online and get your confirmation by email straight away.`;
  return buildPageMetadata({ path: "/book", title: TITLE, description });
}

function toWizardService(service: Service): WizardService {
  return {
    slug: service.slug,
    name: service.name,
    category: service.category,
    summary: service.summary,
    durationMinutes: service.durationMinutes,
    price: service.price,
    priceFrom: service.priceFrom,
    priceNote: service.priceNote,
  };
}

/** Reads ?service= (request data), so it renders inside the Suspense boundary. */
async function BookingWizardLoader({
  searchParams,
  cancellationPolicy,
  contact,
}: {
  searchParams: SearchParams;
  cancellationPolicy: string;
  contact: BusinessContact;
}) {
  const [query, services] = await Promise.all([searchParams, getBookableServices()]);
  const requested = typeof query.service === "string" ? query.service : null;
  const initialServiceSlug = services.some((service) => service.slug === requested) ? requested : null;

  return (
    <BookingWizard
      services={services.map(toWizardService)}
      initialServiceSlug={initialServiceSlug}
      cancellationPolicy={cancellationPolicy}
      contact={contact}
    />
  );
}

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const [settings, bookingSettings] = await Promise.all([getSiteSettings(), getBookingSettings()]);
  const contact: BusinessContact = { email: settings.email, phone: settings.phone };
  const intro = bookingSettings.autoConfirm
    ? "Choose a service, then a time that suits you — you'll get instant confirmation by email. All times are in Pacific Time."
    : "Choose a service, then a time that suits you. You'll get an email as soon as your request is in, and another once it's confirmed. All times are in Pacific Time.";

  return (
    <>
      <PageHeader eyebrow="Book online" title={TITLE} intro={intro} />
      <div className="container-site pb-20 pt-10 sm:pb-24 sm:pt-14">
        <Suspense fallback={<BookingWizardSkeleton />}>
          <BookingWizardLoader
            searchParams={searchParams}
            cancellationPolicy={bookingSettings.cancellationPolicy}
            contact={contact}
          />
        </Suspense>
      </div>
    </>
  );
}
