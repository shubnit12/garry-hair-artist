import Link from "next/link";

import { ButtonLink } from "@/components/ui/Button";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";
import { getHomePage } from "@/lib/content/get";
import { BOOK_HREF } from "@/lib/site";

/**
 * Closing call to action shared by the inner pages. Copy defaults to the
 * editable home-page CTA so it stays consistent across the site.
 */
export async function BookingCta({
  heading,
  text,
  secondary,
}: {
  heading?: string;
  text?: string;
  /** Optional quieter link next to the main button. */
  secondary?: { href: string; label: string };
}) {
  const home = await getHomePage();
  const title = heading ?? home.ctaHeading;
  const body = text ?? home.ctaText;

  return (
    <section aria-labelledby="booking-cta-title" className="border-t border-ink-line">
      <div className="container-site flex flex-col items-center py-20 text-center sm:py-28">
        <Eyebrow className="mb-6 text-smoke">Appointments · Book online</Eyebrow>
        <DisplayHeading id="booking-cta-title" size="lg" className="max-w-3xl">
          {title}
        </DisplayHeading>
        {body ? <p className="mt-6 max-w-xl text-sm leading-relaxed text-paper/85 sm:text-base">{body}</p> : null}
        <div className="mt-10 flex w-full flex-col items-center justify-center gap-4 sm:w-auto sm:flex-row sm:gap-6">
          <ButtonLink href={BOOK_HREF} variant="paper" size="lg" className="w-full sm:w-auto">
            Book an appointment
          </ButtonLink>
          {secondary ? (
            <Link
              href={secondary.href}
              className="inline-flex min-h-11 items-center text-sm underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-transparent"
            >
              {secondary.label}
            </Link>
          ) : null}
        </div>
      </div>
    </section>
  );
}
