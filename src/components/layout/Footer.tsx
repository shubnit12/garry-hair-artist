import { cacheLife } from "next/cache";
import Link from "next/link";

import { businessToday } from "@/lib/booking/time";
import type { BookingSettings, SiteSettings } from "@/lib/content/types";
import {
  formatAddressLines,
  groupOpeningHours,
  mapsDirectionsUrl,
  telHref,
} from "@/lib/format";
import { BOOK_HREF, NAV_LINKS } from "@/lib/site";

const SOCIAL_LABELS = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
} as const;

/**
 * Cached so the footer stays in the static shell (no per-request clock read).
 * The year is Garry's (business timezone), not the server's UTC; an hourly
 * lifetime flips it soon after local midnight on New Year's.
 */
async function CopyrightYear() {
  "use cache";
  cacheLife("hours");
  return <>{businessToday(new Date()).slice(0, 4)}</>;
}

function FooterHeading({ children }: { children: string }) {
  return <h2 className="mb-4 text-[13px] font-bold uppercase tracking-[0.18em]">{children}</h2>;
}

const linkClass = "text-sm text-paper/85 transition-colors hover:text-paper hover:underline underline-offset-4";

/** Five-column footer matching the reference layout, plus a giant wordmark. */
export function Footer({
  settings,
  booking,
}: {
  settings: SiteSettings;
  booking: BookingSettings;
}) {
  const socials = (Object.keys(SOCIAL_LABELS) as (keyof typeof SOCIAL_LABELS)[]).flatMap((key) => {
    const href = settings.social[key];
    return href ? [{ key, href, label: SOCIAL_LABELS[key] }] : [];
  });
  const hours = groupOpeningHours(booking.weeklyHours);
  const addressLines = formatAddressLines(settings.address);

  return (
    <footer className="mt-auto border-t border-ink-line bg-ink">
      {/* Hours spans two columns at sm and never shrinks below its content at lg, so it can't run into Legal. */}
      <div className="container-site grid grid-cols-2 gap-x-6 gap-y-10 py-14 sm:grid-cols-3 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(max-content,1fr)_minmax(0,1fr)]">
        <nav aria-label="Footer">
          <FooterHeading>Navigation</FooterHeading>
          <ul className="space-y-2">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className={linkClass}>
                  {link.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href={BOOK_HREF} className={linkClass}>
                Book Online
              </Link>
            </li>
          </ul>
        </nav>

        <div>
          <FooterHeading>Location</FooterHeading>
          <address className="space-y-1 text-sm not-italic text-paper/85">
            {addressLines.map((line) => (
              <div key={line}>{line}</div>
            ))}
          </address>
          <a
            href={mapsDirectionsUrl(settings.mapQuery)}
            target="_blank"
            rel="noopener noreferrer"
            className={`${linkClass} mt-3 inline-block underline`}
          >
            Get directions<span className="sr-only"> (opens in a new tab)</span>
          </a>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <FooterHeading>Contact</FooterHeading>
          <ul className="space-y-2">
            <li>
              <a href={`mailto:${settings.email}`} className={`${linkClass} break-all`}>
                {settings.email}
              </a>
            </li>
            {settings.phone ? (
              <li>
                <a href={telHref(settings.phone)} className={linkClass}>
                  {settings.phone}
                </a>
              </li>
            ) : null}
          </ul>
          {socials.length ? (
            <div className="mt-8">
              <FooterHeading>Follow</FooterHeading>
              <ul className="space-y-2">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a href={social.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {social.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className="col-span-2 lg:col-span-1">
          <FooterHeading>Hours</FooterHeading>
          <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5 text-sm text-paper/85">
            {hours.map((row) => (
              <div key={row.label} className="contents">
                <dt className="whitespace-nowrap">{row.label}</dt>
                <dd className="whitespace-nowrap">{row.hours}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-3 text-xs text-smoke">By appointment</p>
        </div>

        <div className="col-span-2 sm:col-span-1">
          <FooterHeading>Legal</FooterHeading>
          <ul className="space-y-2">
            <li>
              <Link href="/privacy" className={linkClass}>
                Privacy Policy
              </Link>
            </li>
          </ul>
        </div>
      </div>

      {/*
        Sized to the container's content box (the name is ~7.3em wide), so it
        always fits and centres. Clipped sideways only, as a guard for a longer
        name from the CMS; never vertically, which cut the descenders.
      */}
      <div className="container-site overflow-x-clip @container">
        <p
          aria-hidden="true"
          className="select-none whitespace-nowrap text-center font-blackletter text-[min(13cqw,12rem)] leading-none text-paper"
        >
          {settings.businessName}
        </p>
      </div>

      <div className="container-site flex flex-col gap-2 border-t border-ink-line py-6 text-xs text-smoke sm:flex-row sm:items-center sm:justify-between">
        <p>
          © <CopyrightYear /> {settings.businessName}. All rights reserved.
        </p>
        <p>{settings.tagline}</p>
      </div>
    </footer>
  );
}
