import type { ReactNode } from "react";

import { ArrowLink, ButtonLink } from "@/components/ui/Button";
import {
  ArrowUpRightIcon,
  CalendarIcon,
  ClockIcon,
  InstagramIcon,
  MailIcon,
  MapPinIcon,
  PhoneIcon,
} from "@/components/ui/icons";
import type { BookingSettings, SiteSettings, SocialLinks } from "@/lib/content/types";
import { formatAddressLines, groupOpeningHours, mapsDirectionsUrl, telHref } from "@/lib/format";
import { BOOK_HREF } from "@/lib/site";

const SOCIAL_LABELS: Record<keyof SocialLinks, string> = {
  instagram: "Instagram",
  facebook: "Facebook",
  tiktok: "TikTok",
  youtube: "YouTube",
};

const linkClass =
  "inline-flex min-h-11 items-center gap-2 underline decoration-paper/40 decoration-1 underline-offset-[6px] transition-colors hover:decoration-paper";

/** Left column of the contact page: online-booking card + contact details. */
export function ContactDetails({ settings, booking }: { settings: SiteSettings; booking: BookingSettings }) {
  const hours = groupOpeningHours(booking.weeklyHours);
  const addressLines = formatAddressLines(settings.address);
  const socials = (Object.keys(SOCIAL_LABELS) as (keyof SocialLinks)[]).flatMap((key) => {
    const href = settings.social[key];
    return href ? [{ key, href, label: SOCIAL_LABELS[key] }] : [];
  });

  return (
    <div className="space-y-12">
      <section aria-labelledby="book-online-title" className="border border-paper/70 p-6 sm:p-8">
        <CalendarIcon size={28} />
        <h2 id="book-online-title" className="mt-5 font-mono text-base font-semibold uppercase tracking-[0.14em] sm:text-lg">
          Book online
        </h2>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-paper/85">
          Appointments are booked online. Choose a service and an available time — you&apos;ll receive an email with
          all the details.
        </p>
        <div className="mt-7 flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-center sm:gap-6">
          <ButtonLink href={BOOK_HREF} variant="paper" className="w-full sm:w-auto">
            Book now
          </ButtonLink>
          <ArrowLink href="/services" className="min-h-11">
            Services &amp; prices
          </ArrowLink>
        </div>
      </section>

      <section aria-labelledby="contact-details-title">
        <h2 id="contact-details-title" className="font-mono text-base uppercase tracking-[0.14em] sm:text-lg">
          Contact details
        </h2>
        <ul className="mt-6 divide-y divide-ink-line border-y border-ink-line">
          <DetailItem icon={<MailIcon size={18} />} label="Email">
            <a href={`mailto:${settings.email}`} className={`${linkClass} break-all`}>
              {settings.email}
            </a>
          </DetailItem>

          {settings.phone ? (
            <DetailItem icon={<PhoneIcon size={18} />} label="Phone">
              <a href={telHref(settings.phone)} className={linkClass}>
                {settings.phone}
              </a>
            </DetailItem>
          ) : null}

          <DetailItem icon={<MapPinIcon size={18} />} label="Location">
            <address className="not-italic leading-relaxed">
              {addressLines.map((line) => (
                <span key={line} className="block">
                  {line}
                </span>
              ))}
            </address>
            <a
              href={mapsDirectionsUrl(settings.mapQuery)}
              target="_blank"
              rel="noopener noreferrer"
              className={`${linkClass} mt-1`}
            >
              Get directions
              <ArrowUpRightIcon size={14} />
              <span className="sr-only"> (opens in a new tab)</span>
            </a>
          </DetailItem>

          {hours.length ? (
            <DetailItem icon={<ClockIcon size={18} />} label="Hours">
              <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-5 gap-y-1.5">
                {hours.map((row) => (
                  <div key={row.label} className="contents">
                    <dt className="whitespace-nowrap text-paper/85">{row.label}</dt>
                    {/* Wraps only on the narrowest phones. */}
                    <dd className={`min-[360px]:whitespace-nowrap ${row.hours === "Closed" ? "text-smoke" : ""}`}>
                      {row.hours}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mt-3 text-xs text-smoke">By appointment</p>
            </DetailItem>
          ) : null}

          {socials.length ? (
            <DetailItem icon={<InstagramIcon size={18} />} label="Follow">
              <ul className="flex flex-wrap gap-x-6">
                {socials.map((social) => (
                  <li key={social.key}>
                    <a href={social.href} target="_blank" rel="noopener noreferrer" className={linkClass}>
                      {social.label}
                      <span className="sr-only"> (opens in a new tab)</span>
                    </a>
                  </li>
                ))}
              </ul>
            </DetailItem>
          ) : null}
        </ul>
      </section>
    </div>
  );
}

function DetailItem({ icon, label, children }: { icon: ReactNode; label: string; children: ReactNode }) {
  return (
    <li className="grid grid-cols-[2.75rem_minmax(0,1fr)] gap-x-4 py-6 sm:gap-x-6">
      <span aria-hidden="true" className="flex size-11 items-center justify-center border border-ink-line">
        {icon}
      </span>
      <div className="min-w-0">
        <h3 className="text-[11px] uppercase tracking-[0.2em] text-smoke">{label}</h3>
        <div className="mt-1 text-sm sm:text-[15px]">{children}</div>
      </div>
    </li>
  );
}
