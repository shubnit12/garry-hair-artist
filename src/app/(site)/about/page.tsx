import type { Metadata } from "next";

import { AboutStory } from "@/components/about/AboutStory";
import { Philosophy } from "@/components/about/Philosophy";
import { RecentWork } from "@/components/about/RecentWork";
import { BookingCta } from "@/components/services/BookingCta";
import { PageHeader } from "@/components/ui/PageHeader";
import { getAboutPage, getGallery, getSiteSettings } from "@/lib/content/get";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getAboutPage();
  return buildPageMetadata({ path: "/about", title: page.heading, description: page.intro, seo: page.seo });
}

export default async function AboutPage() {
  const [page, gallery, settings] = await Promise.all([getAboutPage(), getGallery(), getSiteSettings()]);
  const location = [settings.address.city, settings.address.region].filter(Boolean).join(", ");

  return (
    <>
      <PageHeader eyebrow={page.eyebrow} title={page.heading} intro={page.intro} />
      <AboutStory
        portrait={page.portrait}
        story={page.story}
        signature={settings.shortName}
        caption={location ? `Hair artist · ${location}` : "Hair artist"}
      />
      <Philosophy heading={page.philosophyHeading} text={page.philosophyText} values={page.values} />
      <RecentWork items={gallery} instagramUrl={settings.social.instagram} />
      <BookingCta />
    </>
  );
}
