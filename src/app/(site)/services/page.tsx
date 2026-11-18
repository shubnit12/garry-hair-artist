import type { Metadata } from "next";
import Link from "next/link";

import { BookingCta } from "@/components/services/BookingCta";
import { CategoryNav } from "@/components/services/CategoryNav";
import { groupServicesByCategory } from "@/components/services/categories";
import { ServiceCategoryPanel } from "@/components/services/ServiceCategoryPanel";
import { PageHeader } from "@/components/ui/PageHeader";
import { Eyebrow } from "@/components/ui/Typography";
import { getServices, getServicesPage } from "@/lib/content/get";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getServicesPage();
  return buildPageMetadata({ path: "/services", title: page.heading, description: page.intro, seo: page.seo });
}

export default async function ServicesPage() {
  const [page, services] = await Promise.all([getServicesPage(), getServices()]);
  const groups = groupServicesByCategory(services);

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.heading} intro={page.intro} />

      <div className="container-site py-10 sm:py-14">
        {groups.length ? (
          <>
            <CategoryNav groups={groups} />
            <div className="mt-10 space-y-6 sm:mt-12 sm:space-y-8">
              {groups.map((group) => (
                <ServiceCategoryPanel key={group.value} group={group} />
              ))}
            </div>
          </>
        ) : (
          <div className="border border-ink-line px-6 py-14 text-center">
            <p className="text-sm text-paper/85">
              The service menu is being updated. Please{" "}
              <Link href="/contact" className="underline underline-offset-4">
                get in touch
              </Link>{" "}
              to ask about availability and pricing.
            </p>
          </div>
        )}

        {page.note ? (
          <aside
            aria-label="About pricing"
            className="mt-10 grid gap-4 border border-ink-line p-6 sm:mt-12 sm:grid-cols-[12rem_1fr] sm:gap-8 sm:p-8"
          >
            <Eyebrow className="text-smoke">Good to know</Eyebrow>
            <p className="max-w-3xl text-sm leading-relaxed text-paper/85">{page.note}</p>
          </aside>
        ) : null}
      </div>

      <BookingCta secondary={{ href: "/contact", label: "Have a question? Get in touch" }} />
    </>
  );
}
