import { ArrowLink, ButtonLink } from "@/components/ui/Button";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";
import { BOOK_HREF } from "@/lib/site";

const HELPFUL_LINKS = [
  { href: "/services", label: "Services & prices" },
  { href: "/about", label: "About Garry" },
  { href: "/contact", label: "Contact" },
] as const;

/** On-brand 404 content, shared by the in-site and root not-found pages. */
export function NotFoundMessage() {
  return (
    <section
      aria-labelledby="not-found-title"
      className="container-site grid gap-12 pb-20 pt-14 sm:pb-28 sm:pt-20 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:items-end lg:gap-16 lg:pt-28"
    >
      <div className="min-w-0 animate-fade-up">
        <Eyebrow className="text-smoke">Error 404 · Page not found</Eyebrow>
        <DisplayHeading as="h1" id="not-found-title" size="xl" className="mt-5">
          Lost Your Way?
        </DisplayHeading>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-paper/85 sm:text-base">
          This page took a different turn. The link may be out of date or the page may have moved —
          let&apos;s get you back to the chair.
        </p>
        <div className="mt-10 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
          <ButtonLink href={BOOK_HREF} variant="paper" size="lg">
            Book an appointment
          </ButtonLink>
          <ButtonLink href="/" variant="outline" size="lg">
            Back to home
          </ButtonLink>
        </div>
      </div>

      <nav aria-label="Helpful links" className="border-t border-dashed border-ink-line pt-8 lg:border-l lg:border-t-0 lg:pb-2 lg:pl-10 lg:pt-0">
        <p className="mb-4 text-[13px] font-bold uppercase tracking-[0.18em]">Try instead</p>
        <ul className="space-y-1">
          {HELPFUL_LINKS.map((link) => (
            <li key={link.href}>
              <ArrowLink href={link.href} className="min-h-11">
                {link.label}
              </ArrowLink>
            </li>
          ))}
        </ul>
      </nav>
    </section>
  );
}
