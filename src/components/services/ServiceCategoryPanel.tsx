import { ButtonLink } from "@/components/ui/Button";
import { ClockIcon } from "@/components/ui/icons";
import { PaperPanel } from "@/components/ui/Panel";
import type { Service } from "@/lib/content/types";
import { formatDuration, formatServicePrice } from "@/lib/format";
import { BOOK_HREF } from "@/lib/site";

import type { ServiceGroup } from "./categories";

/** One white menu panel per category: blackletter title, then dashed-rule rows. */
export function ServiceCategoryPanel({ group }: { group: ServiceGroup }) {
  const titleId = `${group.anchor}-title`;
  const count = group.services.length;

  return (
    <section id={group.anchor} aria-labelledby={titleId} className="scroll-mt-24">
      <PaperPanel
        title={group.label}
        titleId={titleId}
        intro={
          <p className="font-mono text-[11px] uppercase tracking-[0.2em]">
            {count} {count === 1 ? "service" : "services"}
          </p>
        }
      >
        <ul className="divide-y divide-dashed divide-paper-line">
          {group.services.map((service) => (
            <ServiceRow key={service.id} service={service} />
          ))}
        </ul>
      </PaperPanel>
    </section>
  );
}

function ServiceRow({ service }: { service: Service }) {
  const nameId = `${service.slug}-name`;

  return (
    <li id={service.slug} className="scroll-mt-24 transition-colors duration-500 target:bg-paper-soft">
      <article
        aria-labelledby={nameId}
        className="grid gap-6 px-5 py-8 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto] md:items-center md:gap-12 lg:px-12 lg:py-10"
      >
        <div className="min-w-0">
          <h3 id={nameId} className="font-mono text-sm font-semibold uppercase tracking-[0.14em] sm:text-base">
            {service.name}
          </h3>
          {service.summary ? (
            <p className="mt-3 max-w-2xl text-sm leading-relaxed sm:text-[15px]">{service.summary}</p>
          ) : null}
          {service.description ? (
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ash">{service.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-4 md:min-w-52 md:flex-col md:items-end md:justify-center">
          <dl className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
            <div>
              <dt className="sr-only">Duration</dt>
              <dd className="flex items-center gap-2 text-ash">
                <ClockIcon size={15} />
                {formatDuration(service.durationMinutes)}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Price</dt>
              <dd className="font-semibold">{formatServicePrice(service)}</dd>
            </div>
          </dl>
          {service.bookable ? (
            <ButtonLink
              href={`${BOOK_HREF}?service=${encodeURIComponent(service.slug)}`}
              variant="ink"
              aria-label={`Book ${service.name}`}
              className="min-w-28"
            >
              Book
            </ButtonLink>
          ) : (
            <ButtonLink
              href={`/contact?topic=${encodeURIComponent(service.name)}`}
              variant="outline"
              aria-label={`Enquire about ${service.name}`}
              className="min-w-28"
            >
              Enquire
            </ButtonLink>
          )}
        </div>
      </article>
    </li>
  );
}
