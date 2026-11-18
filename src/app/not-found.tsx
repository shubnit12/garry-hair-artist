import type { Metadata } from "next";

import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { Marquee } from "@/components/layout/Marquee";
import { NotFoundMessage } from "@/components/seo/NotFoundMessage";
import { getBookingSettings, getSiteSettings } from "@/lib/content/get";

/**
 * Root 404 for URLs that match no route. It renders inside the root layout
 * only — outside the (site) route group — so it adds the same marquee,
 * header and footer itself to keep the page on-brand.
 */

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you were looking for could not be found.",
  robots: { index: false, follow: true },
};

export default async function NotFound() {
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
        <NotFoundMessage />
      </main>
      <Footer settings={settings} booking={booking} />
    </div>
  );
}
