import { ChevronLeftIcon } from "@sanity/icons/ChevronLeft";
import { ChevronRightIcon } from "@sanity/icons/ChevronRight";
import { RefreshIcon } from "@sanity/icons/Refresh";
import {
  Badge,
  Box,
  Button,
  Card,
  Flex,
  Grid,
  Heading,
  Spinner,
  Stack,
  Switch,
  Text,
  useMatchMedia,
} from "@sanity/ui";
import { useEffect, useId, useMemo, useState } from "react";

import type { OpeningHours } from "../../../lib/content/types";
import { NewBookingButton } from "../../components/NewPrivateDocument";
import { isActiveStatus } from "../../lib/constants";
import { overlappingIds } from "../../lib/conflicts";
import {
  addDays,
  formatDate,
  formatTime,
  formatWeekRange,
  isDateString,
  startOfWeek,
  weekDates,
  weekdayOf,
} from "../../lib/dates";
import { timeOffCoversDate, type TimeOffEntry } from "../../lib/hours";
import { BookingCard, TimeOffCard } from "./CalendarItems";
import {
  useBusinessToday,
  useCalendarData,
  type CalendarBooking,
  type CalendarData,
} from "./useCalendarData";

/**
 * "Calendar" Studio tool: Garry's week at a glance. Seven columns on wide
 * screens, a day-by-day agenda on phones. Data stays live while open.
 */

const WEEK_STORAGE_KEY = "garry-studio:calendar-week";
/** At least 44px tall on touch-sized screens, regular Studio size on desktop. */
const BUTTON_SIZE = { padding: 3, fontSize: [2, 2, 1] };

type DayModel = {
  date: string;
  isToday: boolean;
  hours: OpeningHours;
  timeOff: (TimeOffEntry & { _id: string })[];
  bookings: CalendarBooking[];
  overlapping: Set<string>;
};

function readStoredWeek(): string | null {
  try {
    const stored = window.sessionStorage.getItem(WEEK_STORAGE_KEY);
    return isDateString(stored) ? startOfWeek(stored) : null;
  } catch {
    return null;
  }
}

function buildDays(dates: string[], data: CalendarData, today: string, showCancelled: boolean): DayModel[] {
  return dates.map((date) => {
    const dayBookings = data.bookings.filter((booking) => booking.date === date);
    const active = dayBookings.filter((booking) => isActiveStatus(booking.status));
    return {
      date,
      isToday: date === today,
      hours: data.weeklyHours[weekdayOf(date)],
      timeOff: data.timeOff.filter(
        (entry): entry is TimeOffEntry & { _id: string } =>
          Boolean(entry._id) && timeOffCoversDate(entry, date),
      ),
      bookings: showCancelled ? dayBookings : dayBookings.filter((booking) => booking.status !== "cancelled"),
      overlapping: overlappingIds(
        active.flatMap((booking) =>
          booking.time
            ? [{ id: booking._id, time: booking.time, durationMinutes: booking.durationMinutes }]
            : [],
        ),
      ),
    };
  });
}

function summarise(data: CalendarData): string {
  const active = data.bookings.filter((booking) => isActiveStatus(booking.status));
  const pending = active.filter((booking) => booking.status === "pending").length;
  if (!active.length) return "No appointments";
  const appointments = `${active.length} appointment${active.length === 1 ? "" : "s"}`;
  return pending ? `${appointments} · ${pending} waiting for confirmation` : appointments;
}

export function BookingCalendar() {
  const today = useBusinessToday();
  const thisWeek = startOfWeek(today);
  const [weekStart, setWeekStart] = useState(() => readStoredWeek() ?? thisWeek);
  const [showCancelled, setShowCancelled] = useState(false);
  const isWide = useMatchMedia("(min-width: 900px)", () => true);

  const dates = useMemo(() => weekDates(weekStart), [weekStart]);
  const result = useCalendarData(dates[0]!, dates[6]!);
  const data = result.status === "ready" ? result.data : null;
  const days = useMemo(
    () => (data ? buildDays(dates, data, today, showCancelled) : []),
    [data, dates, today, showCancelled],
  );
  const cancelledCount = data ? data.bookings.filter((booking) => booking.status === "cancelled").length : 0;
  const reload =
    result.status === "error" ? result.retry : result.status === "ready" ? result.refresh : undefined;

  useEffect(() => {
    try {
      window.sessionStorage.setItem(WEEK_STORAGE_KEY, weekStart);
    } catch {
      // Storage can be unavailable (private mode); the week simply isn't remembered.
    }
  }, [weekStart]);

  return (
    <Card height="fill" overflow="auto">
      <Box padding={[3, 4, 5]}>
        <Stack gap={5}>
          <Flex
            direction={["column", "column", "row"]}
            gap={4}
            justify="space-between"
            align={["stretch", "stretch", "flex-end"]}
          >
            <Stack gap={3}>
              <Heading as="h1" size={[2, 2, 3]}>
                Calendar
              </Heading>
              <Text size={1} muted aria-live="polite">
                Week of {formatWeekRange(weekStart)}
                {result.status === "ready" ? ` · ${summarise(result.data)}` : ""}
              </Text>
            </Stack>

            <Flex gap={2} wrap="wrap" align="center">
              <Button
                icon={ChevronLeftIcon}
                mode="ghost"
                {...BUTTON_SIZE}
                aria-label="Previous week"
                title="Previous week"
                onClick={() => setWeekStart((week) => addDays(week, -7))}
              />
              <Button
                text="This week"
                mode="ghost"
                {...BUTTON_SIZE}
                disabled={weekStart === thisWeek}
                onClick={() => setWeekStart(thisWeek)}
              />
              <Button
                icon={ChevronRightIcon}
                mode="ghost"
                {...BUTTON_SIZE}
                aria-label="Next week"
                title="Next week"
                onClick={() => setWeekStart((week) => addDays(week, 7))}
              />
              <Button
                icon={result.status === "ready" && result.refreshing ? <Spinner /> : RefreshIcon}
                mode="bleed"
                {...BUTTON_SIZE}
                aria-label="Refresh"
                title="Refresh"
                disabled={result.status === "loading"}
                onClick={reload}
              />
              <NewBookingButton {...BUTTON_SIZE} />
            </Flex>
          </Flex>

          {result.status === "ready" && cancelledCount > 0 ? (
            <Flex as="label" gap={2} align="center" style={{ cursor: "pointer", minHeight: 44 }}>
              <Switch checked={showCancelled} onChange={() => setShowCancelled((value) => !value)} />
              <Text size={1}>Show cancelled ({cancelledCount})</Text>
            </Flex>
          ) : null}

          {result.status === "ready" && result.error ? (
            <Card tone="caution" padding={3} radius={2} border role="status">
              <Text size={1}>Couldn&apos;t refresh just now — showing the last loaded bookings.</Text>
            </Card>
          ) : null}

          {result.status === "loading" ? (
            <Flex align="center" justify="center" gap={3} padding={6} role="status">
              <Spinner muted />
              <Text muted size={1}>
                Loading bookings…
              </Text>
            </Flex>
          ) : null}

          {result.status === "error" ? (
            <Card tone="critical" padding={4} radius={2} border role="alert">
              <Stack gap={4}>
                <Text weight="semibold">Couldn&apos;t load the calendar</Text>
                <Text size={1} muted>
                  {result.error.message || "Please check your connection and try again."}
                </Text>
                <Box>
                  <Button text="Try again" tone="critical" {...BUTTON_SIZE} onClick={result.retry} />
                </Box>
              </Stack>
            </Card>
          ) : null}

          {result.status === "ready" ? isWide ? <WeekGrid days={days} /> : <Agenda days={days} /> : null}
        </Stack>
      </Box>
    </Card>
  );
}

function hoursLabel(hours: OpeningHours): string {
  return hours.closed ? "Closed" : `${formatTime(hours.open)} – ${formatTime(hours.close)}`;
}

function DayItems({ day }: { day: DayModel }) {
  if (!day.bookings.length && !day.timeOff.length) {
    return (
      <Text size={1} muted>
        No bookings
      </Text>
    );
  }

  return (
    <Stack gap={2}>
      {day.timeOff.map((entry) => (
        <TimeOffCard key={entry._id} entry={entry} />
      ))}
      {day.bookings.map((booking) => (
        <BookingCard key={booking._id} booking={booking} overlaps={day.overlapping.has(booking._id)} />
      ))}
    </Stack>
  );
}

function DayHeading({ day, id }: { day: DayModel; id: string }) {
  return (
    <Card padding={2} radius={2} tone={day.isToday ? "primary" : "inherit"}>
      <Stack gap={2}>
        <Flex align="center" justify="space-between" gap={2} wrap="wrap">
          <Heading as="h2" size={1} id={id}>
            {formatDate(day.date)}
          </Heading>
          {day.isToday ? <Badge tone="primary">Today</Badge> : null}
        </Flex>
        <Text size={1} muted>
          {hoursLabel(day.hours)}
        </Text>
      </Stack>
    </Card>
  );
}

function WeekGrid({ days }: { days: DayModel[] }) {
  return (
    <Grid gridTemplateColumns={7} gap={2}>
      {days.map((day) => (
        <DayColumn key={day.date} day={day} />
      ))}
    </Grid>
  );
}

function DayColumn({ day }: { day: DayModel }) {
  const headingId = useId();
  return (
    <Card
      as="section"
      aria-labelledby={headingId}
      padding={2}
      radius={3}
      border
      tone={day.hours.closed ? "transparent" : "default"}
      style={{ minHeight: 280, minWidth: 0 }}
    >
      <Stack gap={3}>
        <DayHeading day={day} id={headingId} />
        <DayItems day={day} />
      </Stack>
    </Card>
  );
}

function Agenda({ days }: { days: DayModel[] }) {
  return (
    <Stack gap={4}>
      {days.map((day) => (
        <AgendaDay key={day.date} day={day} />
      ))}
    </Stack>
  );
}

function AgendaDay({ day }: { day: DayModel }) {
  const headingId = useId();
  return (
    <Stack as="section" aria-labelledby={headingId} gap={2}>
      <DayHeading day={day} id={headingId} />
      <Box paddingX={2}>
        <DayItems day={day} />
      </Box>
    </Stack>
  );
}
