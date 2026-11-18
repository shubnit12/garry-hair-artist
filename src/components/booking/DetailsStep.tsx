"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, type FormEvent, type ReactNode, type Ref, type RefObject } from "react";

import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon } from "@/components/ui/icons";
import { bookingRequestSchema } from "@/lib/booking/schema";
import type { CreateBookingResponse } from "@/lib/booking/types";
import { formatTime24 } from "@/lib/format";

import { createBooking, describeFailure, isServiceOutage, type ApiFailure } from "./api";
import { ContactOptions } from "./ContactOptions";
import { formatDayMonth } from "./dates";
import { Notice } from "./Notice";
import { StepFrame } from "./StepFrame";
import type { BusinessContact, DetailsField, DetailsValues, WizardService } from "./types";

const FIELD_ORDER: DetailsField[] = ["name", "email", "phone", "notes", "consent"];
const NOTES_LIMIT = 1000;

/** The honeypot is validated server-side only, so bots get no client-side hint. */
const detailsSchema = bookingRequestSchema.omit({ website: true, startedAt: true });

type FieldErrors = Partial<Record<DetailsField, string>>;

function isDetailsField(key: string): key is DetailsField {
  return (FIELD_ORDER as string[]).includes(key);
}

function validate(selection: { serviceSlug: string; date: string; time: string }, values: DetailsValues): FieldErrors {
  const result = detailsSchema.safeParse({ ...selection, ...values });
  if (result.success) return {};
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && isDetailsField(key)) errors[key] ??= issue.message;
  }
  return errors;
}

const inputClass =
  "block min-h-12 w-full scroll-mt-32 border border-ink/60 bg-paper px-3.5 py-3 text-base text-ink transition-colors placeholder:text-[#737373] hover:border-ink focus:border-ink focus-visible:outline-2 focus-visible:outline-offset-0 focus-visible:outline-ink aria-invalid:border-danger aria-invalid:focus-visible:outline-danger";

function FieldShell({
  id,
  label,
  required,
  error,
  hint,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.16em]">
        {label}
        {required ? (
          <span aria-hidden="true" className="ml-1">
            *
          </span>
        ) : (
          <span className="ml-2 font-normal normal-case tracking-normal text-ash">(optional)</span>
        )}
      </label>
      {children}
      {hint}
      {error ? (
        <p id={`${id}-error`} className="mt-2 text-[13px] text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type FormProblem = { message: string; showContact: boolean };

/** Step 3 — contact details, notes and consent; submits the booking. */
export function DetailsStep({
  service,
  date,
  time,
  values,
  notice,
  cancellationPolicy,
  contact,
  startedAtRef,
  headingRef,
  onValuesChange,
  onBack,
  onBooked,
  onSlotTaken,
  onSelectionInvalid,
}: {
  service: WizardService;
  date: string;
  time: string;
  values: DetailsValues;
  notice: ReactNode;
  cancellationPolicy: string;
  contact: BusinessContact;
  startedAtRef: RefObject<number | null>;
  headingRef: Ref<HTMLHeadingElement>;
  onValuesChange: (values: DetailsValues) => void;
  onBack: () => void;
  onBooked: (result: CreateBookingResponse) => void;
  onSlotTaken: (message: string) => void;
  onSelectionInvalid: (step: 1 | 2, message: string) => void;
}) {
  const baseId = useId();
  const ids = {
    name: `${baseId}-name`,
    email: `${baseId}-email`,
    phone: `${baseId}-phone`,
    notes: `${baseId}-notes`,
    consent: `${baseId}-consent`,
  } satisfies Record<DetailsField, string>;
  const policyId = `${baseId}-policy`;
  const notesCountId = `${baseId}-notes-count`;

  const [touched, setTouched] = useState<Partial<Record<DetailsField, boolean>>>({});
  const [submitAttempted, setSubmitAttempted] = useState(false);
  const [serverErrors, setServerErrors] = useState<FieldErrors>({});
  const [problem, setProblem] = useState<FormProblem | null>(null);
  const [submitting, setSubmitting] = useState(false);
  /** `elementId` null = the problem banner. */
  const [focusRequest, setFocusRequest] = useState<{ elementId: string | null; count: number } | null>(null);
  const submittingRef = useRef(false);
  const problemRef = useRef<HTMLDivElement>(null);

  const selection = { serviceSlug: service.slug, date, time };
  const clientErrors = validate(selection, values);
  const errorFor = (field: DetailsField) =>
    serverErrors[field] ?? (touched[field] || submitAttempted ? clientErrors[field] : undefined);

  // Focus moves after the render that shows the errors, so they are announced.
  useEffect(() => {
    if (!focusRequest) return;
    if (focusRequest.elementId) document.getElementById(focusRequest.elementId)?.focus();
    else problemRef.current?.focus();
  }, [focusRequest]);

  // The anti-bot timer should reflect a recent form view, not a tab left open for days.
  useEffect(() => {
    const startedAt = startedAtRef.current;
    if (!startedAt || Date.now() - startedAt > 12 * 60 * 60 * 1000) startedAtRef.current = Date.now();
  }, [startedAtRef]);

  function requestFocus(target: DetailsField | "problem") {
    const elementId = target === "problem" ? null : ids[target];
    setFocusRequest((previous) => ({ elementId, count: (previous?.count ?? 0) + 1 }));
  }

  function update<K extends DetailsField>(field: K, value: DetailsValues[K]) {
    onValuesChange({ ...values, [field]: value });
    if (serverErrors[field]) {
      setServerErrors((previous) => {
        const next = { ...previous };
        delete next[field];
        return next;
      });
    }
  }

  function blur(field: DetailsField) {
    setTouched((previous) => (previous[field] ? previous : { ...previous, [field]: true }));
  }

  function describedBy(field: DetailsField, ...extra: (string | false | undefined)[]) {
    return [...extra, errorFor(field) ? `${ids[field]}-error` : undefined].filter(Boolean).join(" ") || undefined;
  }

  function handleFailure(failure: ApiFailure) {
    if (failure.kind === "http" && failure.status === 409) {
      onSlotTaken(failure.message ?? "Sorry — someone else just booked that time. Please choose another.");
      return;
    }

    if (failure.kind === "http" && failure.status === 400 && failure.fieldErrors) {
      const mapped: FieldErrors = {};
      for (const [key, messages] of Object.entries(failure.fieldErrors)) {
        const message = messages[0] ?? "Please check this field.";
        if (key === "serviceSlug") return onSelectionInvalid(1, message);
        if (key === "date" || key === "time") return onSelectionInvalid(2, message);
        if (isDetailsField(key)) mapped[key] ??= message;
      }
      const first = FIELD_ORDER.find((field) => mapped[field]);
      if (first) {
        setServerErrors(mapped);
        requestFocus(first);
        return;
      }
    }

    let message: string;
    if (failure.kind === "network") {
      message =
        "We couldn't confirm your booking because the connection was interrupted. Please check your email before trying again — if a confirmation arrived, you're booked.";
    } else if (failure.status === 503) {
      message = describeFailure(failure, "Online booking is temporarily unavailable.");
    } else if (failure.status >= 500) {
      message = "Something went wrong on our side and your booking wasn't completed. Please try again.";
    } else {
      message = describeFailure(failure, "We couldn't submit your booking. Please check your details and try again.");
    }
    setProblem({ message, showContact: isServiceOutage(failure) });
    requestFocus("problem");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submittingRef.current) return;

    setSubmitAttempted(true);
    setServerErrors({});
    const errors = validate(selection, values);
    const firstInvalid = FIELD_ORDER.find((field) => errors[field]);
    if (firstInvalid) {
      setProblem(null);
      requestFocus(firstInvalid);
      return;
    }

    const honeypot = new FormData(event.currentTarget).get("website");
    submittingRef.current = true;
    setSubmitting(true);
    setProblem(null);

    const result = await createBooking({
      ...selection,
      name: values.name,
      email: values.email,
      phone: values.phone,
      notes: values.notes,
      consent: true,
      website: typeof honeypot === "string" ? honeypot : "",
      startedAt: startedAtRef.current ?? undefined,
    });

    if (result.ok) {
      // Leave the guard engaged: this step unmounts on success.
      onBooked(result.data);
      return;
    }
    submittingRef.current = false;
    setSubmitting(false);
    handleFailure(result.failure);
  }

  const notesLength = values.notes.length;

  return (
    <form method="post" noValidate onSubmit={handleSubmit} aria-busy={submitting || undefined}>
      <StepFrame
        eyebrow="Step 3 of 4 · Your details"
        title="Your details"
        description={
          <p>
            {service.name} on {formatDayMonth(date)} at {formatTime24(time)} Pacific Time. We&rsquo;ll send your
            confirmation to the email below.
          </p>
        }
        headingRef={headingRef}
        actions={
          <>
            <Button type="submit" variant="ink" size="lg" disabled={submitting} className="w-full sm:w-auto">
              {submitting ? (
                <>
                  <span aria-hidden="true" className="size-3.5 animate-spin border-2 border-current border-r-transparent" />
                  Booking…
                </>
              ) : (
                "Confirm booking"
              )}
            </Button>
            <Button variant="outline" size="lg" onClick={onBack} disabled={submitting} className="w-full sm:w-auto">
              <ChevronLeftIcon size={16} />
              Back
            </Button>
          </>
        }
      >
        {notice}
        <p role="status" className="sr-only">
          {submitting ? "Submitting your booking…" : ""}
        </p>

        {problem ? (
          <Notice ref={problemRef} focusable tone="error" title="Your booking wasn't completed" className="mb-8 scroll-mt-32">
            <p>{problem.message}</p>
            {problem.showContact ? (
              <div className="space-y-2">
                <p className="text-ash">You can also book directly:</p>
                <ContactOptions contact={contact} />
              </div>
            ) : null}
          </Notice>
        ) : null}

        <div className="grid max-w-3xl gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <FieldShell id={ids.name} label="Full name" required error={errorFor("name")}>
              <input
                id={ids.name}
                name="name"
                type="text"
                autoComplete="name"
                autoCapitalize="words"
                maxLength={80}
                required
                value={values.name}
                onChange={(event) => update("name", event.target.value)}
                onBlur={() => blur("name")}
                aria-invalid={Boolean(errorFor("name")) || undefined}
                aria-describedby={describedBy("name")}
                className={inputClass}
              />
            </FieldShell>
          </div>

          <FieldShell id={ids.email} label="Email" required error={errorFor("email")}>
            <input
              id={ids.email}
              name="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              autoCapitalize="none"
              spellCheck={false}
              maxLength={254}
              required
              value={values.email}
              onChange={(event) => update("email", event.target.value)}
              onBlur={() => blur("email")}
              aria-invalid={Boolean(errorFor("email")) || undefined}
              aria-describedby={describedBy("email")}
              className={inputClass}
            />
          </FieldShell>

          <FieldShell id={ids.phone} label="Phone" required error={errorFor("phone")}>
            <input
              id={ids.phone}
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              maxLength={25}
              required
              value={values.phone}
              onChange={(event) => update("phone", event.target.value)}
              onBlur={() => blur("phone")}
              aria-invalid={Boolean(errorFor("phone")) || undefined}
              aria-describedby={describedBy("phone")}
              className={inputClass}
            />
          </FieldShell>

          <div className="sm:col-span-2">
            <FieldShell
              id={ids.notes}
              label="Notes"
              error={errorFor("notes")}
              hint={
                <p id={notesCountId} className="mt-2 text-right text-xs tabular-nums text-ash">
                  <span aria-hidden="true">
                    {notesLength}/{NOTES_LIMIT}
                  </span>
                  <span className="sr-only">
                    {notesLength} of {NOTES_LIMIT} characters used
                  </span>
                </p>
              }
            >
              <textarea
                id={ids.notes}
                name="notes"
                rows={4}
                maxLength={NOTES_LIMIT}
                value={values.notes}
                onChange={(event) => update("notes", event.target.value)}
                onBlur={() => blur("notes")}
                placeholder="Anything we should know — hair history, inspiration, allergies…"
                aria-invalid={Boolean(errorFor("notes")) || undefined}
                aria-describedby={describedBy("notes", notesCountId)}
                className={`${inputClass} resize-y`}
              />
            </FieldShell>
          </div>

          <div className="sm:col-span-2">
            <div className="flex items-start gap-3">
              <input
                id={ids.consent}
                name="consent"
                type="checkbox"
                required
                checked={values.consent}
                onChange={(event) => update("consent", event.target.checked)}
                onBlur={() => blur("consent")}
                aria-invalid={Boolean(errorFor("consent")) || undefined}
                aria-describedby={describedBy("consent", policyId)}
                className="mt-0.5 size-5 shrink-0 scroll-mt-32 cursor-pointer accent-ink"
              />
              <label htmlFor={ids.consent} className="cursor-pointer text-sm leading-relaxed">
                I agree to be contacted about this appointment and accept the cancellation policy.
                <span aria-hidden="true" className="ml-1">
                  *
                </span>
              </label>
            </div>
            <div id={policyId} className="mt-3 border-l-2 border-paper-line pl-4 text-[13px] leading-relaxed text-ash sm:ml-8">
              <p>
                <span className="font-semibold text-ink">Cancellation policy:</span> {cancellationPolicy}
              </p>
              <p className="mt-2">
                Your details are only used to manage your appointment. See our{" "}
                <Link href="/privacy" className="text-ink underline underline-offset-4 hover:no-underline">
                  Privacy Policy
                </Link>
                .
              </p>
            </div>
            {errorFor("consent") ? (
              <p id={`${ids.consent}-error`} className="mt-2 text-[13px] text-danger sm:ml-8">
                {errorFor("consent")}
              </p>
            ) : null}
          </div>
        </div>

        {/* Honeypot: hidden from people and assistive tech; bots tend to fill it. */}
        <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
          <label htmlFor={`${baseId}-website`}>Website</label>
          <input id={`${baseId}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" defaultValue="" />
        </div>

        <p className="mt-8 text-xs text-ash">
          <span aria-hidden="true">*</span> Required
        </p>
      </StepFrame>
    </form>
  );
}
