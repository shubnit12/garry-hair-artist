"use client";

import { useId } from "react";

import { Button } from "@/components/ui/Button";
import { CheckIcon } from "@/components/ui/icons";
import type { AvailabilityResponse, TimeSlot } from "@/lib/booking/types";
import { formatTime24 } from "@/lib/format";

import { describeFailure, isServiceOutage, type ApiFailure } from "./api";
import { CLEAR_SUMMARY_BAR } from "./BookingSummary";
import { ContactOptions } from "./ContactOptions";
import { DAY_PERIODS, formatDayMonth, periodOf } from "./dates";
import type { BusinessContact } from "./types";

const slotGrid = "grid grid-cols-3 gap-2 @sm:grid-cols-4 @lg:grid-cols-5 @2xl:grid-cols-6";

function SlotButton({
  slot,
  selected,
  onSelect,
}: {
  slot: TimeSlot;
  selected: boolean;
  onSelect: (time: string) => void;
}) {
  const label = formatTime24(slot.time);
  const base = `flex min-h-12 w-full flex-col items-center justify-center border px-1 text-sm tabular-nums ${CLEAR_SUMMARY_BAR}`;

  if (slot.status === "booked") {
    return (
      <button
        type="button"
        disabled
        aria-label={`${label}, already booked`}
        className={`${base} cursor-not-allowed border-dashed border-paper-line bg-paper-soft text-ash`}
      >
        <span className="leading-tight line-through decoration-1">{label}</span>
        <span className="mt-0.5 text-[9px] uppercase leading-none tracking-[0.18em]">Booked</span>
      </button>
    );
  }

  if (slot.status === "unavailable") {
    return (
      <button
        type="button"
        disabled
        aria-label={`${label}, unavailable`}
        className={`${base} cursor-not-allowed border-paper-line/40 text-ash/45`}
      >
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${label}, available`}
      onClick={() => onSelect(slot.time)}
      // The ring sits outside the button on paper, so it can't follow a white (selected/hover) text colour.
      className={`${base} relative font-medium transition-colors focus-visible:outline-ink ${
        selected ? "border-ink bg-ink text-paper" : "border-ink/70 bg-paper text-ink hover:bg-ink hover:text-paper"
      }`}
    >
      {selected ? <CheckIcon size={12} className="absolute right-1 top-1" /> : null}
      {label}
    </button>
  );
}

function SlotLegend() {
  const item = "flex items-center gap-2";
  const swatch = "inline-block size-3.5 shrink-0 border";
  return (
    <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.12em] text-ash">
      <li className={item}>
        <span aria-hidden="true" className={`${swatch} border-ink/70 bg-paper`} />
        Available
      </li>
      <li className={item}>
        <span aria-hidden="true" className={`${swatch} border-ink bg-ink`} />
        Selected
      </li>
      <li className={item}>
        <span aria-hidden="true" className={`${swatch} border-dashed border-paper-line bg-paper-soft`} />
        Booked
      </li>
      <li className={item}>
        <span aria-hidden="true" className={`${swatch} border-paper-line/40`} />
        Unavailable
      </li>
    </ul>
  );
}

function SlotSkeleton() {
  return (
    <div aria-hidden="true" className="mt-5 space-y-6">
      {[6, 9].map((count, group) => (
        <div key={group}>
          <div className="mb-2.5 h-3 w-24 animate-pulse bg-paper-soft" />
          <div className={slotGrid}>
            {Array.from({ length: count }, (_, index) => (
              <div key={index} className="h-12 animate-pulse bg-paper-soft" />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function statusMessage({
  date,
  findingDate,
  data,
  pending,
  failure,
  serviceName,
}: {
  date: string | null;
  findingDate: boolean;
  data: AvailabilityResponse | null;
  pending: boolean;
  failure: ApiFailure | null;
  serviceName: string;
}): string {
  if (!date) return findingDate ? "Finding the next available date…" : "Choose a date to see available times.";
  const day = formatDayMonth(date);
  if (pending) return `Loading times for ${day}…`;
  if (!data) return failure ? describeFailure(failure, "We couldn't load the times for this day.") : "";
  if (data.closed) return `Closed on ${day}. Please choose another date.`;
  if (!data.slots.length) return `There are no times for ${serviceName} on ${day}. Please choose another date.`;
  const open = data.slots.filter((slot) => slot.status === "available").length;
  if (!open) return `Fully booked on ${day} — every time is taken. Please choose another date.`;
  return `${open} ${open === 1 ? "time" : "times"} available on ${day}.`;
}

/** Day's start times grouped by part of day, with live status from the API. */
export function SlotPicker({
  date,
  findingDate,
  serviceName,
  data,
  loading,
  failure,
  retrying,
  onRetry,
  selectedTime,
  onSelectTime,
  contact,
}: {
  date: string | null;
  /** No date chosen yet and the calendar is still loading its first month. */
  findingDate: boolean;
  serviceName: string;
  data: AvailabilityResponse | null;
  loading: boolean;
  failure: ApiFailure | null;
  retrying: boolean;
  onRetry: () => void;
  selectedTime: string | null;
  onSelectTime: (time: string) => void;
  contact: BusinessContact;
}) {
  const baseId = useId();
  const pending = loading || (retrying && !data);
  const message = statusMessage({ date, findingDate, data, pending, failure, serviceName });
  const showSlots = data !== null && !data.closed && data.slots.length > 0;
  const blocked = Boolean(data && (data.closed || !data.slots.some((slot) => slot.status === "available")));

  return (
    <div className="@container min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h3 className="text-sm font-semibold uppercase tracking-[0.16em]">Available times</h3>
        <p className="text-[11px] uppercase tracking-[0.12em] text-ash">Pacific Time</p>
      </div>

      <p
        role="status"
        className={`mt-2 text-sm leading-relaxed ${blocked ? "border-l-4 border-l-ink bg-paper-soft p-3 text-ink" : "text-ash"}`}
      >
        {message}
      </p>

      {failure && !data && !pending ? (
        <div className="mt-4 space-y-4">
          <Button variant="ink" size="sm" onClick={onRetry}>
            Try again
          </Button>
          {isServiceOutage(failure) ? (
            <div className="space-y-2 text-sm">
              <p className="text-ash">You can also book by getting in touch:</p>
              <ContactOptions contact={contact} />
            </div>
          ) : null}
        </div>
      ) : null}

      {pending && date ? <SlotSkeleton /> : null}

      {showSlots && !pending ? (
        <div className="mt-5 space-y-6">
          {DAY_PERIODS.map((period) => {
            const slots = data.slots.filter((slot) => periodOf(slot.time) === period.value);
            if (!slots.length) return null;
            const open = slots.filter((slot) => slot.status === "available").length;
            const headingId = `${baseId}-${period.value}`;
            return (
              <div key={period.value} role="group" aria-labelledby={headingId}>
                <h4
                  id={headingId}
                  className="mb-2.5 flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.2em] text-ash"
                >
                  <span>{period.label}</span>
                  <span className="normal-case tracking-normal">{open ? `${open} open` : "None open"}</span>
                </h4>
                <ul className={slotGrid}>
                  {slots.map((slot) => (
                    <li key={slot.time}>
                      <SlotButton slot={slot} selected={slot.time === selectedTime} onSelect={onSelectTime} />
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      ) : null}

      {showSlots && !pending ? <SlotLegend /> : null}
    </div>
  );
}
