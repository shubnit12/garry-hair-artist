"use client";

import { useEffect, useRef, useState } from "react";

import type { CreateBookingResponse } from "@/lib/booking/types";

import { SummaryBar, SummaryCard } from "./BookingSummary";
import { ConfirmationStep } from "./ConfirmationStep";
import { ContactOptions } from "./ContactOptions";
import { DateTimeStep } from "./DateTimeStep";
import { DetailsStep } from "./DetailsStep";
import { prefersReducedMotion } from "./hooks";
import { Notice } from "./Notice";
import { ServiceStep } from "./ServiceStep";
import { StepIndicator } from "./StepIndicator";
import type { BusinessContact, DetailsValues, WizardNotice, WizardService, WizardStep } from "./types";

const EMPTY_DETAILS: DetailsValues = { name: "", email: "", phone: "", notes: "", consent: false };

/** Keeps ?service= in the address bar so a refresh restores the choice (no navigation). */
function syncServiceParam(slug: string) {
  const url = new URL(window.location.href);
  if (url.searchParams.get("service") === slug) return;
  url.searchParams.set("service", slug);
  window.history.replaceState(null, "", `${url.pathname}${url.search}${url.hash}`);
}

/** Never render a step whose prerequisites are missing. */
function resolveStep(
  step: WizardStep,
  state: { service: WizardService | null; date: string | null; time: string | null; result: CreateBookingResponse | null },
): WizardStep {
  if (step === 4 && state.result) return 4;
  if (!state.service) return 1;
  if (step >= 3 && (!state.date || !state.time)) return 2;
  return step === 4 ? 3 : step;
}

export type BookingWizardProps = {
  services: WizardService[];
  /** Valid, bookable slug from ?service= — the wizard then opens on step 2. */
  initialServiceSlug: string | null;
  cancellationPolicy: string;
  contact: BusinessContact;
};

/**
 * Four-step booking flow: service → date & time → details → confirmation.
 * Talks to the booking API only over HTTP (see components/booking/api.ts).
 */
export function BookingWizard({ services, initialServiceSlug, cancellationPolicy, contact }: BookingWizardProps) {
  const [step, setStep] = useState<WizardStep>(initialServiceSlug ? 2 : 1);
  const [serviceSlug, setServiceSlug] = useState<string | null>(initialServiceSlug);
  const [date, setDate] = useState<string | null>(null);
  const [time, setTime] = useState<string | null>(null);
  const [viewMonth, setViewMonth] = useState<string | null>(null);
  const [notice, setNotice] = useState<WizardNotice | null>(null);
  const [details, setDetails] = useState<DetailsValues>(EMPTY_DETAILS);
  const [result, setResult] = useState<CreateBookingResponse | null>(null);

  const rootRef = useRef<HTMLDivElement>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const moveFocusRef = useRef(false);
  const startedAtRef = useRef<number | null>(null);

  const service = services.find((candidate) => candidate.slug === serviceSlug) ?? null;
  const activeStep = resolveStep(step, { service, date, time, result });

  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  // On every step change (not the first render) bring the wizard into view and
  // move focus to the new step's heading so screen readers announce it.
  useEffect(() => {
    if (!moveFocusRef.current) return;
    moveFocusRef.current = false;
    rootRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth", block: "start" });
    headingRef.current?.focus({ preventScroll: true });
  }, [activeStep]);

  function goTo(next: WizardStep) {
    if (next === activeStep) return;
    moveFocusRef.current = true;
    setStep(next);
  }

  function selectService(slug: string) {
    if (slug === serviceSlug) return;
    setServiceSlug(slug);
    setTime(null);
    setNotice(null);
    syncServiceParam(slug);
  }

  if (!services.length) {
    return (
      <div className="theme-paper max-w-3xl space-y-5 p-6 sm:p-10">
        <h2 className="text-lg font-semibold uppercase tracking-[0.12em]">Online booking is paused</h2>
        <p className="text-sm leading-relaxed text-ash">
          There are no services available to book online right now. Please get in touch and we&rsquo;ll find a time
          for you.
        </p>
        <ContactOptions contact={contact} />
      </div>
    );
  }

  const noticeNode = notice ? (
    <Notice tone={notice.tone} className="mb-8">
      <p>{notice.message}</p>
    </Notice>
  ) : null;

  const summary = { service, date, time };

  return (
    <div ref={rootRef} className="scroll-mt-20 sm:scroll-mt-24">
      <div className={`grid items-start gap-8 ${activeStep < 4 ? "xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-10" : ""}`}>
        <div className="min-w-0 space-y-5">
          <StepIndicator current={activeStep} onSelect={goTo} />

          {activeStep < 4 ? <SummaryBar {...summary} className="xl:hidden" /> : null}

          {activeStep === 1 ? (
            <ServiceStep
              services={services}
              selectedSlug={serviceSlug}
              notice={noticeNode}
              onSelect={selectService}
              onContinue={() => goTo(2)}
              headingRef={headingRef}
            />
          ) : null}

          {activeStep === 2 && service ? (
            <DateTimeStep
              key={service.slug}
              service={service}
              date={date}
              time={time}
              viewMonth={viewMonth}
              notice={noticeNode}
              contact={contact}
              headingRef={headingRef}
              onDateChange={setDate}
              onTimeChange={setTime}
              onViewMonthChange={setViewMonth}
              onNotice={setNotice}
              onBack={() => goTo(1)}
              onContinue={() => {
                setNotice(null);
                goTo(3);
              }}
            />
          ) : null}

          {activeStep === 3 && service && date && time ? (
            <DetailsStep
              service={service}
              date={date}
              time={time}
              values={details}
              notice={noticeNode}
              cancellationPolicy={cancellationPolicy}
              contact={contact}
              startedAtRef={startedAtRef}
              headingRef={headingRef}
              onValuesChange={setDetails}
              onBack={() => goTo(2)}
              onBooked={(booked) => {
                setResult(booked);
                setNotice(null);
                goTo(4);
              }}
              onSlotTaken={(message) => {
                setTime(null);
                setNotice({ tone: "warning", message });
                goTo(2);
              }}
              onSelectionInvalid={(target, message) => {
                if (target === 2) setTime(null);
                setNotice({ tone: "error", message });
                goTo(target);
              }}
            />
          ) : null}

          {activeStep === 4 && result ? <ConfirmationStep result={result} headingRef={headingRef} /> : null}
        </div>

        {activeStep < 4 ? (
          <div className="hidden xl:sticky xl:top-24 xl:block">
            <SummaryCard {...summary} contact={contact} onChangeService={activeStep > 1 ? () => goTo(1) : undefined} />
          </div>
        ) : null}
      </div>
    </div>
  );
}
