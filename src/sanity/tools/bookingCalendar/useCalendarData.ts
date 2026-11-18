import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useClient } from "sanity";

import { normaliseStatus, STUDIO_API_VERSION, type BookingStatus } from "../../lib/constants";
import { businessToday } from "../../lib/dates";
import {
  resolveWeeklyHours,
  type RawOpeningHours,
  type TimeOffEntry,
  type WeeklyHours,
} from "../../lib/hours";

export type CalendarBooking = {
  _id: string;
  date: string;
  time?: string;
  status: BookingStatus;
  customerName?: string;
  serviceName?: string;
  durationMinutes: number;
};

export type CalendarData = {
  bookings: CalendarBooking[];
  timeOff: TimeOffEntry[];
  weeklyHours: WeeklyHours;
};

type RawCalendarData = {
  bookings: (Omit<CalendarBooking, "status"> & { status?: string })[];
  timeOff: TimeOffEntry[];
  settings: { weeklyHours?: RawOpeningHours[] | null } | null;
};

// Bookings and time off are liveEdit, so the published perspective is the truth.
// The stored serviceName is a snapshot from booking time; once the reference
// points at a different service (its slug no longer matches), that service's name wins.
const CALENDAR_QUERY = /* groq */ `{
  "bookings": *[_type == "booking" && date >= $from && date <= $to] | order(date asc, time asc) {
    _id,
    date,
    time,
    status,
    customerName,
    "serviceName": select(
      defined(service->slug.current) && service->slug.current != serviceSlug => service->name,
      coalesce(serviceName, service->name)
    ),
    "durationMinutes": coalesce(durationMinutes, service->durationMinutes, 60)
  },
  "timeOff": *[_type == "timeOff" && startDate <= $to && coalesce(endDate, startDate) >= $from] | order(startDate asc) {
    _id, reason, startDate, endDate, allDay, startTime, endTime
  },
  "settings": *[_id == "bookingSettings"][0]{ weeklyHours[]{ day, closed, open, close } }
}`;

const LISTEN_QUERY = /* groq */ `*[_type in ["booking", "timeOff", "bookingSettings"]]`;

const CLIENT_OPTIONS = { apiVersion: STUDIO_API_VERSION };

/** Refetch shortly after a burst of changes rather than once per mutation. */
const LIVE_DEBOUNCE_MS = 500;
/** Safety net in case the live connection drops without an error. */
const POLL_INTERVAL_MS = 60_000;

type FetchState = {
  range: string;
  revision: number;
  data?: CalendarData;
  error?: Error;
};

export type CalendarResult =
  | { status: "loading" }
  | { status: "error"; error: Error; retry: () => void }
  | { status: "ready"; data: CalendarData; refreshing: boolean; error?: Error; refresh: () => void };

function normalise(raw: RawCalendarData): CalendarData {
  return {
    bookings: (raw.bookings ?? []).map((booking) => ({
      ...booking,
      status: normaliseStatus(booking.status),
    })),
    timeOff: raw.timeOff ?? [],
    weeklyHours: resolveWeeklyHours(raw.settings?.weeklyHours),
  };
}

/** Bookings, time off and opening hours for `from`–`to`, kept live. */
export function useCalendarData(from: string, to: string): CalendarResult {
  const client = useClient(CLIENT_OPTIONS);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<FetchState | null>(null);
  const range = `${from}|${to}`;

  const refresh = useCallback(() => setRevision((value) => value + 1), []);

  useEffect(() => {
    const controller = new AbortController();
    client
      .fetch<RawCalendarData>(
        CALENDAR_QUERY,
        { from, to },
        { signal: controller.signal, perspective: "published", tag: "studio.calendar" },
      )
      .then((raw) => setState({ range, revision, data: normalise(raw) }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;
        setState((previous) => ({
          range,
          revision,
          // Keep showing the last good data for this week if a refresh fails.
          data: previous?.range === range ? previous.data : undefined,
          error: error instanceof Error ? error : new Error("Unknown error"),
        }));
      });
    return () => controller.abort();
  }, [client, from, to, range, revision]);

  useEffect(() => {
    let timer: number | undefined;
    const scheduleRefresh = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(refresh, LIVE_DEBOUNCE_MS);
    };

    const subscription = client
      .listen(
        LISTEN_QUERY,
        {},
        { events: ["mutation"], includeResult: false, visibility: "query", tag: "studio.calendar" },
      )
      .subscribe({ next: scheduleRefresh, error: scheduleRefresh });
    const poll = window.setInterval(refresh, POLL_INTERVAL_MS);

    return () => {
      subscription.unsubscribe();
      window.clearTimeout(timer);
      window.clearInterval(poll);
    };
  }, [client, refresh]);

  if (!state || state.range !== range) return { status: "loading" };
  if (!state.data) {
    // While a retry is in flight, show the loading state again.
    if (state.revision !== revision) return { status: "loading" };
    return { status: "error", error: state.error ?? new Error("Unknown error"), retry: refresh };
  }
  return {
    status: "ready",
    data: state.data,
    refreshing: state.revision !== revision,
    error: state.error,
    refresh,
  };
}

const subscribeToClock = (onChange: () => void) => {
  const id = window.setInterval(onChange, 30_000);
  return () => window.clearInterval(id);
};

const readToday = () => businessToday();

/** Today's date in Surrey, BC; updates by itself after midnight. */
export function useBusinessToday(): string {
  return useSyncExternalStore(subscribeToClock, readToday, readToday);
}
