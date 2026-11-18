"use client";

import { useId, useState, type ReactNode, type Ref } from "react";

import { ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CalendarIcon, CheckIcon } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/Typography";
import type { CreateBookingResponse } from "@/lib/booking/types";
import { formatDuration, formatTime24 } from "@/lib/format";

import { formatLongDate } from "./dates";
import { Notice } from "./Notice";
import { stepHeadingClass } from "./StepFrame";

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="py-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[11px] uppercase tracking-[0.16em] text-ash">{label}</dt>
      <dd className="mt-1 text-sm sm:mt-0">{children}</dd>
    </div>
  );
}

/** Step 4 — booking saved: reference, details and next actions. */
export function ConfirmationStep({
  result,
  headingRef,
}: {
  result: CreateBookingResponse;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const { booking, emailSent, message } = result;
  const pending = booking.status === "pending";
  const title = pending ? "Request received" : "You're booked!";
  const headingId = useId();
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function copyReference() {
    try {
      await navigator.clipboard.writeText(booking.reference);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section aria-labelledby={headingId} className="theme-paper">
      <div role="status" className="px-4 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10">
        <Eyebrow className="text-ash">Step 4 of 4 · {pending ? "Request received" : "Confirmed"}</Eyebrow>
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={`mt-3 ${stepHeadingClass}`}>
          {title}
        </h2>
        {message ? <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ash">{message}</p> : null}
      </div>

      <hr className="rule-dashed border-t" />

      <div className="grid gap-8 px-4 py-7 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)] lg:gap-12 lg:px-10">
        <div className="border border-dashed border-ink p-5 text-center sm:p-6">
          <p className="text-[11px] uppercase tracking-[0.2em] text-ash">Booking reference</p>
          <p className="mt-3 wrap-anywhere font-mono text-[clamp(1.75rem,7vw,2.25rem)] font-semibold leading-none tracking-[0.12em]">
            {booking.reference}
          </p>
          <button
            type="button"
            onClick={copyReference}
            className="mt-4 inline-flex min-h-11 items-center gap-2 px-2 text-xs uppercase tracking-[0.14em] underline underline-offset-4 hover:no-underline"
          >
            {copyState === "copied" ? <CheckIcon size={14} /> : null}
            {copyState === "copied" ? "Copied" : "Copy reference"}
          </button>
          <p aria-live="polite" className="text-xs text-ash">
            {copyState === "copied" ? "Reference copied to clipboard." : null}
            {copyState === "failed" ? "Couldn't copy — please note it down." : null}
          </p>
        </div>

        <dl className="divide-y divide-dashed divide-paper-line border-y border-dashed border-paper-line">
          <DetailRow label="Service">{booking.serviceName}</DetailRow>
          <DetailRow label="Date">{formatLongDate(booking.date)}</DetailRow>
          <DetailRow label="Time">{formatTime24(booking.time)} Pacific Time</DetailRow>
          <DetailRow label="Duration">{formatDuration(booking.durationMinutes)}</DetailRow>
          <DetailRow label="Name">{booking.customerName}</DetailRow>
        </dl>
      </div>

      <div className="px-4 pb-7 sm:px-8 lg:px-10">
        {emailSent ? (
          <p className="flex items-center gap-2 text-sm">
            <CheckIcon size={16} className="shrink-0" />
            {pending ? "We’ve emailed you a copy of your request." : "A confirmation email is on its way."}
          </p>
        ) : (
          <Notice tone="warning" role="status">
            <p>
              We couldn&rsquo;t send your {pending ? "request" : "confirmation"} email — please save your reference.
            </p>
          </Notice>
        )}
      </div>

      <div className="rule-dashed flex flex-col gap-3 border-t px-4 py-5 sm:flex-row sm:flex-wrap sm:items-center sm:px-8 lg:px-10">
        <a href={booking.calendarUrl} download className={buttonClasses("ink", "lg", "w-full sm:w-auto")}>
          <CalendarIcon size={16} />
          Add to calendar
        </a>
        <ButtonLink href={booking.manageUrl} variant="outline" size="lg" className="w-full sm:w-auto">
          Manage booking
        </ButtonLink>
        <ButtonLink href="/" variant="outline" size="lg" className="w-full sm:w-auto">
          Back to home
        </ButtonLink>
      </div>
    </section>
  );
}
