import type { Metadata } from "next";

import { NotFoundMessage } from "@/components/seo/NotFoundMessage";

/** Shown inside the site chrome when a page calls notFound(). */

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function SiteNotFound() {
  return <NotFoundMessage />;
}
