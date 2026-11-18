import type { Metadata, Viewport } from "next";
import { Geist_Mono, UnifrakturMaguntia } from "next/font/google";

import { getSiteSettings } from "@/lib/content/get";
import { siteUrl } from "@/lib/env";

import "./globals.css";

const mono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

const blackletter = UnifrakturMaguntia({
  variable: "--font-blackletter",
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings();
  const location = `${settings.address.city}, ${settings.address.region}`;
  const defaultTitle = `${settings.businessName} — Hair Artist in ${location}`;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: defaultTitle, template: `%s | ${settings.businessName}` },
    description: settings.description,
    applicationName: settings.businessName,
    openGraph: {
      type: "website",
      locale: "en_CA",
      siteName: settings.businessName,
      title: defaultTitle,
      description: settings.description,
    },
    twitter: { card: "summary_large_image", title: defaultTitle, description: settings.description },
    robots: { index: true, follow: true },
    formatDetection: { telephone: false },
  };
}

export const viewport: Viewport = {
  themeColor: "#111111",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en-CA" className={`${mono.variable} ${blackletter.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
