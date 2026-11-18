import { ArrowLink, ButtonLink } from "@/components/ui/Button";
import { PaperPanel } from "@/components/ui/Panel";
import type { Service } from "@/lib/content/types";
import { formatDuration, formatServicePrice } from "@/lib/format";
import { BOOK_HREF } from "@/lib/site";

/** Literal class names so Tailwind generates them. */
const COLUMN_CLASSES: Record<number, string> = {
  1: "md:grid-cols-1",
  2: "md:grid-cols-2",
  3: "md:grid-cols-3",
};

function ServiceColumn({ service, first }: { service: Service; first: boolean }) {
  // Featured-but-not-bookable services (e.g. "by consultation only") route to the contact form.
  const action = service.bookable
    ? { href: `${BOOK_HREF}?service=${encodeURIComponent(service.slug)}`, label: "Book Now" }
    : { href: "/contact", label: "Enquire" };

  return (
    <li
      className={`flex flex-col items-center px-6 py-10 text-center sm:px-8 lg:py-14 ${
        first ? "" : "border-t border-dashed border-paper-line md:border-l md:border-t-0 md:border-dotted"
      }`}
    >
      <h3 className="text-[13px] uppercase tracking-[0.16em]">{service.name}</h3>
      <dl className="mt-4 space-y-1 text-[13px] tabular-nums">
        <div>
          <dt className="sr-only">Duration</dt>
          <dd>{formatDuration(service.durationMinutes)}</dd>
        </div>
        <div>
          <dt className="sr-only">Price</dt>
          <dd>{formatServicePrice(service)}</dd>
        </div>
      </dl>
      <p className="mt-4 max-w-[32ch] text-pretty text-sm leading-relaxed text-ash">{service.summary}</p>
      {/* mt-auto keeps the buttons aligned across columns with summaries of different lengths. */}
      <div className="mt-auto pt-6">
        <ButtonLink href={action.href} variant="ink" size="md">
          {action.label}
          <span className="sr-only">: {service.name}</span>
        </ButtonLink>
      </div>
    </li>
  );
}

/**
 * "Our Signature Services" — a white panel with up to three services in
 * centred columns, as in the reference layout.
 */
export function SignatureServices({
  heading,
  intro,
  services,
}: {
  heading: string;
  intro?: string;
  services: Service[];
}) {
  if (!services.length) return null;

  return (
    <section aria-labelledby="home-services-heading" className="container-site py-16 sm:py-20 lg:py-28">
      <PaperPanel title={heading} titleId="home-services-heading" intro={intro || undefined}>
        <ul className={`grid grid-cols-1 ${COLUMN_CLASSES[services.length] ?? COLUMN_CLASSES[3]}`}>
          {services.map((service, index) => (
            <ServiceColumn key={service.id} service={service} first={index === 0} />
          ))}
        </ul>
        <div className="rule-dashed flex justify-center border-t px-6 py-6 sm:py-8">
          <ArrowLink href="/services" className="min-h-11">
            View all services
          </ArrowLink>
        </div>
      </PaperPanel>
    </section>
  );
}
