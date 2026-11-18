import { formatDuration, formatServicePrice, formatTime24 } from "@/lib/format";

import { formatLongDate, formatShortDate } from "./dates";
import type { BusinessContact, WizardService } from "./types";

type SummaryProps = {
  service: WizardService | null;
  date: string | null;
  time: string | null;
};

function SummaryRow({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-3">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-smoke">{label}</dt>
      <dd className={`text-right text-sm ${value ? "text-paper" : "text-smoke"}`}>{value ?? "Not chosen yet"}</dd>
    </div>
  );
}

/** Sticky appointment summary beside the wizard on wide screens. */
export function SummaryCard({
  service,
  date,
  time,
  contact,
  onChangeService,
}: SummaryProps & { contact: BusinessContact; onChangeService?: () => void }) {
  return (
    <aside aria-labelledby="booking-summary-title" className="border border-ink-line p-6">
      <div className="flex items-center justify-between gap-4">
        <h2 id="booking-summary-title" className="text-[11px] uppercase tracking-[0.2em] text-smoke">
          Your appointment
        </h2>
        {service && onChangeService ? (
          <button
            type="button"
            onClick={onChangeService}
            className="-my-3 inline-flex min-h-11 items-center text-xs underline underline-offset-4 hover:no-underline"
          >
            Change<span className="sr-only"> service</span>
          </button>
        ) : null}
      </div>
      <p className="mt-4 font-blackletter text-[2rem] leading-tight">{service?.name ?? "Choose a service"}</p>
      <dl className="mt-4 divide-y divide-dashed divide-ink-line border-y border-dashed border-ink-line">
        <SummaryRow label="Duration" value={service ? formatDuration(service.durationMinutes) : null} />
        <SummaryRow label="Price" value={service ? formatServicePrice(service) : null} />
        <SummaryRow label="Date" value={date ? formatLongDate(date) : null} />
        <SummaryRow label="Time" value={time ? `${formatTime24(time)} Pacific Time` : null} />
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-smoke">
        Questions before you book?{" "}
        <a href={`mailto:${contact.email}`} className="wrap-anywhere text-paper underline underline-offset-4 hover:no-underline">
          {contact.email}
        </a>
      </p>
    </aside>
  );
}

/**
 * Scroll margin for focusable controls that can scroll under the SummaryBar
 * (shown below xl). Added to the header-only `scroll-padding-top` (80px, 88px
 * from sm), it keeps a focused control clear of header + bar (bottom edge
 * ~124px, ~132px from sm) — WCAG 2.4.11. globals.css also widens
 * scroll-padding while `[data-summary-bar]` is on the page.
 */
export const CLEAR_SUMMARY_BAR = "max-xl:scroll-mt-16";

/**
 * Compact summary pinned under the sticky site header on phones and tablets.
 * Must be a direct child of the tall column it should stick within.
 */
export function SummaryBar({ service, date, time, className = "" }: SummaryProps & { className?: string }) {
  if (!service) return null;
  return (
    <section
      aria-label="Your appointment"
      data-summary-bar=""
      className={`sticky top-16 z-30 border border-ink-line bg-ink/95 px-4 py-2.5 backdrop-blur supports-[backdrop-filter]:bg-ink/85 sm:top-18 ${className}`}
    >
      <p className="flex items-baseline justify-between gap-3 text-[13px]">
        <span className="min-w-0 truncate font-semibold uppercase tracking-[0.1em]">{service.name}</span>
        <span className="shrink-0">{formatServicePrice(service)}</span>
      </p>
      <p className="mt-0.5 text-xs text-smoke">
        {formatDuration(service.durationMinutes)}
        {date ? <span className="whitespace-nowrap text-paper/85"> · {formatShortDate(date)}</span> : null}
        {time ? (
          <span className="whitespace-nowrap text-paper/85">
            {" "}
            · {formatTime24(time)} <abbr title="Pacific Time" className="no-underline">PT</abbr>
          </span>
        ) : null}
        {!date ? " · Pick a date and time" : null}
      </p>
    </section>
  );
}
