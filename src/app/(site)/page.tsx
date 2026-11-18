import type { Metadata } from "next";

import { ClosingCta } from "@/components/home/ClosingCta";
import { CraftGallery } from "@/components/home/CraftGallery";
import { HomeHero } from "@/components/home/HomeHero";
import { MeetGarry } from "@/components/home/MeetGarry";
import { SignatureServices } from "@/components/home/SignatureServices";
import { pickSignatureServices } from "@/components/home/signature-services";
import { Testimonials } from "@/components/home/Testimonials";
import {
  getGallery,
  getHomePage,
  getServices,
  getSiteSettings,
  getTestimonials,
} from "@/lib/content/get";
import type { SiteSettings } from "@/lib/content/types";
import { buildPageMetadata } from "@/lib/seo/metadata";

function cityRegion(settings: SiteSettings) {
  return [settings.address.city, settings.address.region].filter(Boolean).join(", ");
}

/** Home SEO from the Studio; title stays the root default unless an SEO title is set. */
export async function generateMetadata(): Promise<Metadata> {
  const home = await getHomePage();
  const metadata = await buildPageMetadata({ path: "/", seo: home.seo });
  if (home.seo.title) metadata.title = { absolute: home.seo.title };
  return metadata;
}

export default async function Home() {
  const [home, services, gallery, testimonials, settings] = await Promise.all([
    getHomePage(),
    getServices(),
    getGallery(),
    getTestimonials(),
    getSiteSettings(),
  ]);

  return (
    <>
      <HomeHero home={home} />
      <SignatureServices
        heading={home.servicesHeading}
        intro={home.servicesIntro}
        services={pickSignatureServices(services)}
      />
      <CraftGallery heading={home.galleryHeading} intro={home.galleryIntro} items={gallery} />
      <MeetGarry
        heading={home.aboutHeading}
        text={home.aboutText}
        image={home.aboutImage}
        name={settings.shortName}
      />
      <Testimonials heading={home.testimonialsHeading} testimonials={testimonials} />
      <ClosingCta heading={home.ctaHeading} text={home.ctaText} location={cityRegion(settings)} />
    </>
  );
}
