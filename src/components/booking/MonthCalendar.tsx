"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { Button } from "@/components/ui/Button";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { CalendarDayStatus, MonthAvailabilityResponse } from "@/lib/booking/types";

import { describeFailure, type ApiFailure } from "./api";
import { CLEAR_SUMMARY_BAR } from "./BookingSummary";
import {
  WEEKDAY_NAMES,
  addDays,
  addMonths,
  formatDayMonth,
  formatMonthLabel,
  monthGrid,
  monthOf,
  shiftMonthKeepingDay,
  weekdayIndex,
} from "./dates";

const STATUS_TEXT: Record<CalendarDayStatus, string> = {
  available: "available",
  full: "fully booked",
  closed: "closed",
  unavailable: "unavailable",
};

/** Full days stay selectable so clients can see which times are taken. */
const SELECTABLE: ReadonlySet<CalendarDayStatus> = new Set(["available", "full"]);

const STATUS_CLASS: Record<CalendarDayStatus | "loading", string> = {
  available: "font-semibold text-ink hover:bg-paper-soft hover:ring-1 hover:ring-inset hover:ring-ink",
  full: "text-ash line-through decoration-1 hover:bg-paper-soft",
  closed: "cursor-not-allowed text-ash/45",
  unavailable: "cursor-not-allowed text-ash/35",
  loading: "cursor-wait text-ash/35",
};

const navButtonClass = `inline-flex size-11 items-center justify-center border border-paper-line transition-colors hover:border-ink disabled:pointer-events-none disabled:opacity-30 ${CLEAR_SUMMARY_BAR}`;

const todayMarker =
  "after:absolute after:bottom-1.5 after:left-1/2 after:h-0.5 after:w-3.5 after:-translate-x-1/2 after:bg-current";

type MonthCalendarProps = {
  /** Month on display ("YYYY-MM"); null until "today" is known on the client. */
  month: string | null;
  /** Availability for `month`, or null while it loads. */
  data: MonthAvailabilityResponse | null;
  failure: ApiFailure | null;
  retrying: boolean;
  onRetry: () => void;
  /** Bookable window from the last response; limits month navigation. */
  range: { first: string; last: string } | null;
  today: string | null;
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  onMonthChange: (month: string) => void;
};

/**
 * Accessible month calendar (APG date-grid pattern): one tab stop, arrow keys
 * move by day/week, Home/End to week edges, PageUp/PageDown by month.
 * Unselectable days stay focusable (aria-disabled) so they can be announced.
 */
export function MonthCalendar({
  month,
  data,
  failure,
  retrying,
  onRetry,
  range,
  today,
  selectedDate,
  onSelectDate,
  onMonthChange,
}: MonthCalendarProps) {
  const labelId = useId();
  const gridRef = useRef<HTMLTableElement>(null);
  const pendingFocusRef = useRef(false);
  const [focusDate, setFocusDate] = useState<string | null>(null);

  // Move DOM focus after keyboard navigation re-renders the grid.
  useEffect(() => {
    if (!pendingFocusRef.current || !focusDate) return;
    const button = gridRef.current?.querySelector<HTMLButtonElement>(`button[data-date="${focusDate}"]`);
    if (!button) return;
    pendingFocusRef.current = false;
    button.focus();
  });

  if (!month) return <CalendarSkeleton />;

  const ready = data !== null && data.month === month;
  const statuses = new Map<string, CalendarDayStatus>(ready ? data.days.map((day) => [day.date, day.status]) : []);
  const statusOf = (date: string): CalendarDayStatus | "loading" =>
    ready ? (statuses.get(date) ?? "unavailable") : "loading";

  const firstMonth = range ? monthOf(range.first) : month;
  const lastMonth = range ? monthOf(range.last) : month;
  const canPrev = month > firstMonth;
  const canNext = month < lastMonth;

  const inView = (date: string | null): date is string => date !== null && monthOf(date) === month;
  const firstAvailable = ready ? data.days.find((day) => day.status === "available")?.date ?? null : null;
  const tabbable = inView(focusDate)
    ? focusDate
    : inView(selectedDate)
      ? selectedDate
      : inView(firstAvailable)
        ? firstAvailable
        : `${month}-01`;

  function handleKeyDown(event: KeyboardEvent<HTMLTableElement>) {
    const origin = (event.target as HTMLElement).closest<HTMLElement>("[data-date]")?.dataset.date;
    if (!origin) return;
    let target: string;
    switch (event.key) {
      case "ArrowLeft":
        target = addDays(origin, -1);
        break;
      case "ArrowRight":
        target = addDays(origin, 1);
        break;
      case "ArrowUp":
        target = addDays(origin, -7);
        break;
      case "ArrowDown":
        target = addDays(origin, 7);
        break;
      case "Home":
        target = addDays(origin, -weekdayIndex(origin));
        break;
      case "End":
        target = addDays(origin, 6 - weekdayIndex(origin));
        break;
      case "PageUp":
        target = shiftMonthKeepingDay(origin, -1);
        break;
      case "PageDown":
        target = shiftMonthKeepingDay(origin, 1);
        break;
      default:
        return;
    }
    event.preventDefault();
    const targetMonth = monthOf(target);
    if (targetMonth < firstMonth || targetMonth > lastMonth) return;
    if (targetMonth !== month) onMonthChange(targetMonth);
    pendingFocusRef.current = true;
    setFocusDate(target);
  }

  const noOpenings = ready && !firstAvailable;

  return (
    <div className="min-w-0">
      <div className="flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, -1))}
          disabled={!canPrev}
          aria-label="Previous month"
          className={navButtonClass}
        >
          <ChevronLeftIcon size={18} />
        </button>
        <h3 id={labelId} aria-live="polite" className="text-sm font-semibold uppercase tracking-[0.16em]">
          {formatMonthLabel(month)}
        </h3>
        <button
          type="button"
          onClick={() => onMonthChange(addMonths(month, 1))}
          disabled={!canNext}
          aria-label="Next month"
          className={navButtonClass}
        >
          <ChevronRightIcon size={18} />
        </button>
      </div>

      {failure && !ready ? (
        <div className="mt-4 space-y-3 border-l-4 border-l-danger bg-paper-soft p-4 text-sm" role="alert">
          <p>{describeFailure(failure, "We couldn't load the calendar.")}</p>
          <Button variant="ink" size="sm" onClick={onRetry} disabled={retrying}>
            {retrying ? "Retrying…" : "Try again"}
          </Button>
        </div>
      ) : null}

      <table
        ref={gridRef}
        role="grid"
        aria-labelledby={labelId}
        aria-busy={!ready || undefined}
        onKeyDown={handleKeyDown}
        className="mt-4 w-full table-fixed border-collapse"
      >
        <thead>
          <tr>
            {WEEKDAY_NAMES.map((name) => (
              <th key={name} scope="col" className="pb-2 text-[10px] font-normal uppercase tracking-[0.12em] text-ash">
                <span aria-hidden="true">{name.slice(0, 3)}</span>
                <span className="sr-only">{name}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {monthGrid(month).map((week, index) => (
            <tr key={index}>
              {week.map((date, column) => {
                if (!date) return <td key={`blank-${column}`} />;
                const status = statusOf(date);
                const selectable = status !== "loading" && SELECTABLE.has(status);
                const selected = date === selectedDate;
                const isToday = date === today;
                const label = [
                  formatDayMonth(date),
                  isToday ? " (today)" : "",
                  status === "loading" ? "" : ` — ${STATUS_TEXT[status]}`,
                  selected ? ", selected" : "",
                ].join("");
                return (
                  <td key={date} className="p-px text-center">
                    <button
                      type="button"
                      data-date={date}
                      tabIndex={date === tabbable ? 0 : -1}
                      aria-label={label}
                      aria-disabled={!selectable || undefined}
                      aria-current={isToday ? "date" : undefined}
                      onClick={() => {
                        setFocusDate(date);
                        if (selectable) onSelectDate(date);
                      }}
                      // Explicit ring colours: the default (currentColor) is too faint on closed/past days.
                      className={`relative flex h-11 w-full items-center justify-center text-sm tabular-nums transition-colors outline-offset-[-3px] ${CLEAR_SUMMARY_BAR} ${
                        selected
                          ? "bg-ink font-semibold text-paper focus-visible:outline-paper"
                          : `${STATUS_CLASS[status]} focus-visible:outline-ink`
                      } ${isToday ? todayMarker : ""}`}
                    >
                      <span aria-hidden="true">{Number(date.slice(8))}</span>
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      {noOpenings ? (
        <p className="mt-3 text-[13px] text-ash">
          No open times in {formatMonthLabel(month)}.{canNext ? " Try the next month." : ""}
        </p>
      ) : null}

      <ul className="mt-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[11px] uppercase tracking-[0.12em] text-ash">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="font-semibold text-ink">
            14
          </span>
          Available
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="line-through">
            14
          </span>
          Fully booked
        </li>
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="opacity-45">
            14
          </span>
          Closed
        </li>
        <li className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="relative pb-1 text-ink after:absolute after:bottom-0 after:left-1/2 after:h-0.5 after:w-3.5 after:-translate-x-1/2 after:bg-current"
          >
            14
          </span>
          Today
        </li>
      </ul>
    </div>
  );
}

function CalendarSkeleton() {
  return (
    <div aria-hidden="true" className="min-w-0">
      <div className="flex items-center justify-between">
        <div className="size-11 border border-paper-line opacity-30" />
        <div className="h-4 w-32 animate-pulse bg-paper-soft" />
        <div className="size-11 border border-paper-line opacity-30" />
      </div>
      <div className="mt-4 grid grid-cols-7 gap-1">
        {Array.from({ length: 35 }, (_, index) => (
          <div key={index} className="h-11 animate-pulse bg-paper-soft" />
        ))}
      </div>
    </div>
  );
}
