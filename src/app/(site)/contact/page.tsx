import type { Metadata } from "next";

import { ContactDetails } from "@/components/contact/ContactDetails";
import { ContactForm } from "@/components/contact/ContactForm";
import { ContactMap } from "@/components/contact/ContactMap";
import { BookingCta } from "@/components/services/BookingCta";
import { PageHeader } from "@/components/ui/PageHeader";
import { DisplayHeading } from "@/components/ui/Typography";
import { getBookingSettings, getContactPage, getServices, getSiteSettings } from "@/lib/content/get";
import { GENERAL_TOPIC } from "@/lib/email/contact";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getContactPage();
  return buildPageMetadata({ path: "/contact", title: page.heading, description: page.intro, seo: page.seo });
}

export default async function ContactPage() {
  const [page, settings, booking, services] = await Promise.all([
    getContactPage(),
    getSiteSettings(),
    getBookingSettings(),
    getServices(),
  ]);
  const topics = Array.from(new Set([GENERAL_TOPIC, ...services.map((service) => service.name)]));
  const location = [settings.address.city, settings.address.region].filter(Boolean).join(", ") || settings.mapQuery;

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.heading} intro={page.intro} />

      <div className="container-site py-12 sm:py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-5">
            <ContactDetails settings={settings} booking={booking} />
          </div>

          <section
            aria-labelledby="contact-form-title"
            className="theme-paper px-5 py-10 sm:px-10 sm:py-12 lg:col-span-7 lg:self-start"
          >
            <DisplayHeading id="contact-form-title" size="md">
              {page.formHeading}
            </DisplayHeading>
            {page.formIntro ? (
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ash sm:text-[15px]">{page.formIntro}</p>
            ) : null}
            <hr className="rule-dashed my-8 border-t" />
            <ContactForm topics={topics} fallbackEmail={settings.email} />
          </section>
        </div>
      </div>

      <ContactMap query={settings.mapQuery} label={location} />
      <BookingCta />
    </>
  );
}
