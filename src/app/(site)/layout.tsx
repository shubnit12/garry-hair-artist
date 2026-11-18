import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Marquee } from "@/components/layout/Marquee";
import { LocalBusinessJsonLd } from "@/components/seo/LocalBusinessJsonLd";
import { getBookingSettings, getSiteSettings } from "@/lib/content/get";

/** Public website chrome. The Studio (/studio) lives outside this group. */
export default async function SiteLayout({ children }: LayoutProps<"/">) {
  const [settings, booking] = await Promise.all([getSiteSettings(), getBookingSettings()]);

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-[60] bg-paper px-4 py-3 text-ink focus:not-sr-only focus:fixed focus:left-4 focus:top-4"
      >
        Skip to content
      </a>
      <Marquee items={settings.announcements} />
      <Header settings={settings} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <Footer settings={settings} booking={booking} />
      <LocalBusinessJsonLd />
    </div>
  );
}
