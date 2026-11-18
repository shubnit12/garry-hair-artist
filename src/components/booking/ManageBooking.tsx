"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { Button, ButtonLink, buttonClasses } from "@/components/ui/Button";
import { CalendarIcon } from "@/components/ui/icons";
import { Eyebrow } from "@/components/ui/Typography";
import type { PublicBooking } from "@/lib/booking/types";
import { formatDuration, formatTime24 } from "@/lib/format";
import { BOOK_HREF } from "@/lib/site";

import { bookingDetailsUrl, cancelBooking, describeFailure, isManageBookingResponse } from "./api";
import { ContactOptions } from "./ContactOptions";
import { formatLongDate } from "./dates";
import { useJsonResource } from "./hooks";
import { ManageBookingSkeleton } from "./ManageBookingSkeleton";
import { Notice } from "./Notice";
import { StatusBadge } from "./StatusBadge";
import type { BusinessContact } from "./types";

type CancelPhase = "idle" | "confirming" | "submitting";
type FocusTarget = "confirm" | "cancel-button" | "outcome";

function isActive(booking: PublicBooking) {
  return booking.status === "pending" || booking.status === "confirmed";
}

function bookAgainHref(booking: PublicBooking) {
  return booking.serviceSlug ? `${BOOK_HREF}?${new URLSearchParams({ service: booking.serviceSlug })}` : BOOK_HREF;
}

function ProblemCard({
  title,
  children,
  contact,
  action,
}: {
  title: string;
  children: ReactNode;
  contact: BusinessContact;
  action?: ReactNode;
}) {
  return (
    <div role="alert" className="theme-paper max-w-3xl px-4 py-8 sm:px-8 sm:py-10 lg:px-10">
      <h2 className="font-blackletter text-[clamp(2rem,6vw,2.75rem)] leading-tight">{title}</h2>
      <div className="mt-4 max-w-xl space-y-3 text-sm leading-relaxed text-ash">{children}</div>
      {action ? <div className="mt-6">{action}</div> : null}
      <div className="rule-dashed mt-8 border-t pt-6">
        <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-ash">Get in touch</p>
        <ContactOptions contact={contact} />
      </div>
    </div>
  );
}

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11px] uppercase tracking-[0.16em] text-ash">{label}</dt>
      <dd className="mt-1.5 text-sm">{children}</dd>
    </div>
  );
}

/**
 * Signed "manage booking" view: details, add-to-calendar and self-service
 * cancellation with an inline confirmation step.
 */
export function ManageBooking({
  bookingId,
  token,
  contact,
}: {
  bookingId: string;
  token: string;
  contact: BusinessContact;
}) {
  const resource = useJsonResource(token ? bookingDetailsUrl(bookingId, token) : null, {
    validate: isManageBookingResponse,
    refetchOnFocus: true,
  });

  const headingId = useId();
  const confirmTextId = useId();
  const [cancelled, setCancelled] = useState<PublicBooking | null>(null);
  const [phase, setPhase] = useState<CancelPhase>("idle");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [focusRequest, setFocusRequest] = useState<{ target: FocusTarget; count: number } | null>(null);
  const submittingRef = useRef(false);
  const confirmRef = useRef<HTMLDivElement>(null);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const outcomeRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!focusRequest) return;
    const element = {
      confirm: confirmRef.current,
      "cancel-button": cancelButtonRef.current,
      outcome: outcomeRef.current,
    }[focusRequest.target];
    element?.focus();
  }, [focusRequest]);

  function requestFocus(target: FocusTarget) {
    setFocusRequest((previous) => ({ target, count: (previous?.count ?? 0) + 1 }));
  }

  if (!token) {
    return (
      <ProblemCard title="This link is invalid or has expired" contact={contact}>
        <p>Please open the &ldquo;Manage booking&rdquo; link from your confirmation email. If it still doesn&rsquo;t work, get in touch and we&rsquo;ll help.</p>
      </ProblemCard>
    );
  }

  const { data, failure } = resource;

  if (!data) {
    if (!failure) return <ManageBookingSkeleton />;
    if (failure?.kind === "http" && failure.status === 403) {
      return (
        <ProblemCard title="This link is invalid or has expired" contact={contact}>
          <p>Please open the &ldquo;Manage booking&rdquo; link from your most recent confirmation email. If it still doesn&rsquo;t work, get in touch and we&rsquo;ll help.</p>
        </ProblemCard>
      );
    }
    if (failure?.kind === "http" && failure.status === 404) {
      return (
        <ProblemCard title="We couldn't find this booking" contact={contact}>
          <p>It may have been removed. If you think this is a mistake, please get in touch with your booking reference.</p>
        </ProblemCard>
      );
    }
    return (
      <ProblemCard
        title="We couldn't load your booking"
        contact={contact}
        action={
          <Button variant="ink" onClick={resource.retry} disabled={resource.retrying}>
            {resource.retrying ? "Retrying…" : "Try again"}
          </Button>
        }
      >
        <p>{failure ? describeFailure(failure, "Something went wrong while loading your booking.") : null}</p>
      </ProblemCard>
    );
  }

  const booking = cancelled ?? data.booking;
  const canCancel = !cancelled && data.canCancel && isActive(booking);
  const active = isActive(booking);

  async function confirmCancel() {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setPhase("submitting");
    setCancelError(null);

    const result = await cancelBooking(bookingId, token);
    submittingRef.current = false;

    if (result.ok) {
      setCancelled(result.data.booking);
      setPhase("idle");
      requestFocus("outcome");
      return;
    }

    const { failure: cancelFailure } = result;
    let message: string;
    if (cancelFailure.kind === "http" && cancelFailure.status === 409) {
      message = cancelFailure.message ?? "This booking can no longer be cancelled online.";
      resource.refresh();
    } else if (cancelFailure.kind === "http" && cancelFailure.status === 403) {
      message = "This link is invalid or has expired, so the booking can't be cancelled here. Please get in touch instead.";
    } else if (cancelFailure.kind === "http" && cancelFailure.status === 404) {
      message = "We couldn't find this booking. Please get in touch with your booking reference.";
    } else {
      message = describeFailure(cancelFailure, "We couldn't cancel your booking. Please try again.");
    }
    setCancelError(message);
    setPhase("idle");
    requestFocus("outcome");
  }

  function startCancel() {
    setCancelError(null);
    setPhase("confirming");
    requestFocus("confirm");
  }

  function keepBooking() {
    setPhase("idle");
    requestFocus("cancel-button");
  }

  function onConfirmKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape" && phase === "confirming") {
      event.stopPropagation();
      keepBooking();
    }
  }

  const when = `${formatLongDate(booking.date)} at ${formatTime24(booking.time)} Pacific Time`;

  return (
    <article aria-labelledby={headingId} className="theme-paper max-w-3xl">
      <div className="flex flex-wrap items-start justify-between gap-4 px-4 pb-6 pt-7 sm:px-8 sm:pt-10 lg:px-10">
        <div>
          <Eyebrow className="text-ash">Booking reference</Eyebrow>
          <p className="mt-2 wrap-anywhere font-mono text-[clamp(1.5rem,6vw,2rem)] font-semibold leading-none tracking-[0.12em]">
            {booking.reference}
          </p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <hr className="rule-dashed border-t" />

      <div className="px-4 py-7 sm:px-8 sm:py-8 lg:px-10">
        <h2 id={headingId} className="font-blackletter text-[clamp(2rem,6vw,2.75rem)] leading-tight">
          {booking.serviceName}
        </h2>
        <dl className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
          <DetailRow label="Date">{formatLongDate(booking.date)}</DetailRow>
          <DetailRow label="Time">{formatTime24(booking.time)} Pacific Time</DetailRow>
          <DetailRow label="Duration">{formatDuration(booking.durationMinutes)}</DetailRow>
          <DetailRow label="Name">{booking.customerName}</DetailRow>
        </dl>
      </div>

      <div className="rule-dashed space-y-5 border-t px-4 py-6 sm:px-8 lg:px-10">
        <div ref={outcomeRef} tabIndex={-1} className="outline-none">
          {cancelled ? (
            <div role="status" className="space-y-4">
              <p className="text-sm leading-relaxed">
                <span className="font-semibold">Your appointment has been cancelled.</span> Thanks for letting us
                know — we hope to see you another time.
              </p>
              <ButtonLink href={bookAgainHref(booking)} variant="ink">
                Book again
              </ButtonLink>
            </div>
          ) : null}
          {cancelError ? (
            <Notice tone="error">
              <p>{cancelError}</p>
            </Notice>
          ) : null}
        </div>

        {!cancelled && booking.status === "pending" ? (
          <p className="text-sm leading-relaxed text-ash">
            This request is waiting to be confirmed. You&rsquo;ll get an email as soon as it is.
          </p>
        ) : null}

        {!cancelled && !active ? (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-ash">
              {booking.status === "cancelled"
                ? "This appointment was cancelled."
                : "This appointment has already taken place."}
            </p>
            <ButtonLink href={bookAgainHref(booking)} variant="ink">
              Book again
            </ButtonLink>
          </div>
        ) : null}

        {active && !canCancel && !cancelled ? (
          <p className="text-sm leading-relaxed text-ash">
            Online cancellation isn&rsquo;t available for this appointment any more. If your plans have changed,
            please get in touch.
          </p>
        ) : null}

        {active ? (
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <a href={booking.calendarUrl} download className={buttonClasses("ink", "md", "w-full sm:w-auto")}>
              <CalendarIcon size={16} />
              Add to calendar
            </a>
            {canCancel && phase === "idle" ? (
              <button
                ref={cancelButtonRef}
                type="button"
                onClick={startCancel}
                className={buttonClasses("outline", "md", "w-full sm:w-auto")}
              >
                Cancel booking
              </button>
            ) : null}
          </div>
        ) : null}

        {canCancel && phase !== "idle" ? (
          <div
            ref={confirmRef}
            tabIndex={-1}
            role="group"
            aria-labelledby={confirmTextId}
            onKeyDown={onConfirmKeyDown}
            className="border border-ink p-5 outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
          >
            <p id={confirmTextId} className="text-sm font-semibold leading-relaxed">
              Cancel your {booking.serviceName} on {when}?
            </p>
            <p className="mt-1 text-sm text-ash">This can&rsquo;t be undone.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Button
                variant="ink"
                onClick={confirmCancel}
                disabled={phase === "submitting"}
                className="w-full sm:w-auto"
              >
                {phase === "submitting" ? "Cancelling…" : "Yes, cancel"}
              </Button>
              <Button
                variant="outline"
                onClick={keepBooking}
                disabled={phase === "submitting"}
                className="w-full sm:w-auto"
              >
                Keep it
              </Button>
            </div>
            <p role="status" className="sr-only">
              {phase === "submitting" ? "Cancelling your booking…" : ""}
            </p>
          </div>
        ) : null}
      </div>

      {data.cancellationPolicy ? (
        <div className="rule-dashed border-t px-4 py-6 sm:px-8 lg:px-10">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.16em]">Cancellation policy</h3>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-ash">{data.cancellationPolicy}</p>
        </div>
      ) : null}

      <div className="rule-dashed border-t px-4 py-6 sm:px-8 lg:px-10">
        <p className="mb-3 text-[11px] uppercase tracking-[0.16em] text-ash">Questions? Get in touch</p>
        <ContactOptions contact={contact} />
      </div>

    </article>
  );
}
