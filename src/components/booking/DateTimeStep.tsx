"use client";

import { useRef, useState, type ReactNode, type Ref } from "react";

import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";

import { dayAvailabilityUrl, isDayAvailability, isMonthAvailability, monthAvailabilityUrl } from "./api";
import { addMonths, monthOf } from "./dates";
import { useBusinessToday, useJsonResource } from "./hooks";
import { MonthCalendar } from "./MonthCalendar";
import { Notice } from "./Notice";
import { SlotPicker } from "./SlotPicker";
import { StepFrame } from "./StepFrame";
import type { BusinessContact, WizardNotice, WizardService } from "./types";

const SLOT_REFRESH_MS = 30_000;
/** How many empty months to skip automatically when looking for a first date. */
const MAX_AUTO_ADVANCE = 2;

/** Step 2 — pick a day on the calendar, then a start time. */
export function DateTimeStep({
  service,
  date,
  time,
  viewMonth,
  notice,
  contact,
  headingRef,
  onDateChange,
  onTimeChange,
  onViewMonthChange,
  onNotice,
  onBack,
  onContinue,
}: {
  service: WizardService;
  date: string | null;
  time: string | null;
  viewMonth: string | null;
  notice: ReactNode;
  contact: BusinessContact;
  headingRef: Ref<HTMLHeadingElement>;
  onDateChange: (date: string) => void;
  onTimeChange: (time: string | null) => void;
  onViewMonthChange: (month: string) => void;
  onNotice: (notice: WizardNotice | null) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const today = useBusinessToday();
  const month = viewMonth ?? (date ? monthOf(date) : today ? monthOf(today) : null);
  const [range, setRange] = useState<{ first: string; last: string } | null>(null);
  const [showContinueError, setShowContinueError] = useState(false);
  const autoAdvanceRef = useRef(0);
  const userNavigatedRef = useRef(false);

  const monthResource = useJsonResource(month ? monthAvailabilityUrl(service.slug, month) : null, {
    validate: isMonthAvailability,
    refetchOnFocus: true,
    onData: (result) => {
      setRange({ first: result.firstBookableDate, last: result.lastBookableDate });
      if (date) return;
      // Default to the first available date, skipping empty months once or twice.
      const firstAvailable = result.days.find((day) => day.status === "available");
      if (firstAvailable) {
        onDateChange(firstAvailable.date);
        return;
      }
      if (
        !userNavigatedRef.current &&
        autoAdvanceRef.current < MAX_AUTO_ADVANCE &&
        result.month < monthOf(result.lastBookableDate)
      ) {
        autoAdvanceRef.current += 1;
        onViewMonthChange(addMonths(result.month, 1));
      }
    },
  });

  const dayResource = useJsonResource(date ? dayAvailabilityUrl(service.slug, date) : null, {
    validate: isDayAvailability,
    pollMs: SLOT_REFRESH_MS,
    refetchOnFocus: true,
    onData: (result) => {
      if (!time || result.date !== date) return;
      const slot = result.slots.find((candidate) => candidate.time === time);
      if (slot?.status === "available") return;
      onTimeChange(null);
      onNotice({
        tone: "warning",
        message:
          slot?.status === "booked"
            ? "That time was just booked — please choose another."
            : "That time is no longer available — please choose another.",
      });
      // The day may have become fully booked.
      monthResource.refresh();
    },
  });

  function selectDate(next: string) {
    if (next === date) return;
    onDateChange(next);
    onTimeChange(null);
    onNotice(null);
    setShowContinueError(false);
  }

  function changeMonth(next: string) {
    userNavigatedRef.current = true;
    onViewMonthChange(next);
  }

  function selectTime(next: string) {
    onTimeChange(next);
    onNotice(null);
    setShowContinueError(false);
  }

  function handleContinue() {
    if (!date || !time) {
      setShowContinueError(true);
      return;
    }
    onContinue();
  }

  return (
    <StepFrame
      eyebrow="Step 2 of 4 · Date & time"
      title="Pick a date & time"
      description="All times are in Pacific Time. Times other clients have already booked are shown crossed out."
      headingRef={headingRef}
      actions={
        <>
          <Button variant="ink" size="lg" onClick={handleContinue} className="w-full sm:w-auto">
            Continue
            <ChevronRightIcon size={16} />
          </Button>
          <Button variant="outline" size="lg" onClick={onBack} className="w-full sm:w-auto">
            <ChevronLeftIcon size={16} />
            Back
          </Button>
        </>
      }
    >
      {notice}
      <div className="grid gap-10 md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)] md:gap-8 xl:grid-cols-[minmax(0,20rem)_minmax(0,1fr)] xl:gap-10">
        <MonthCalendar
          month={month}
          data={monthResource.data}
          failure={monthResource.failure}
          retrying={monthResource.retrying}
          onRetry={monthResource.retry}
          range={range}
          today={today}
          selectedDate={date}
          onSelectDate={selectDate}
          onMonthChange={changeMonth}
        />
        <SlotPicker
          date={date}
          findingDate={!date && (month === null || monthResource.loading)}
          serviceName={service.name}
          data={dayResource.data}
          loading={dayResource.loading}
          failure={dayResource.failure}
          retrying={dayResource.retrying}
          onRetry={dayResource.retry}
          selectedTime={time}
          onSelectTime={selectTime}
          contact={contact}
        />
      </div>
      {showContinueError && (!date || !time) ? (
        <Notice tone="error" className="mt-8">
          <p>{date ? "Please choose a time to continue." : "Please choose a date and time to continue."}</p>
        </Notice>
      ) : null}
    </StepFrame>
  );
}
