import { ButtonLink } from "@/components/ui/Button";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";
import { BOOK_HREF } from "@/lib/site";

/** Closing call to action before the footer. */
export function ClosingCta({
  heading,
  text,
  location,
}: {
  heading: string;
  text: string;
  /** e.g. "Surrey, BC" */
  location: string;
}) {
  return (
    <section aria-labelledby="home-cta-heading" className="border-t border-ink-line">
      <div className="container-site flex flex-col items-center py-20 text-center sm:py-24 lg:py-32">
        <Eyebrow className="text-smoke">
          {location ? `${location} · ` : ""}By appointment
        </Eyebrow>
        <DisplayHeading id="home-cta-heading" size="xl" className="mt-6 max-w-5xl break-words">
          {heading}
        </DisplayHeading>
        {text ? (
          <p className="mt-6 max-w-xl text-pretty text-sm leading-relaxed text-paper/85 sm:text-[15px]">
            {text}
          </p>
        ) : null}
        <div className="mt-10 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
          <ButtonLink href={BOOK_HREF} variant="paper" size="lg">
            Book an appointment
          </ButtonLink>
          <ButtonLink href="/services" variant="outline" size="lg">
            View services
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
