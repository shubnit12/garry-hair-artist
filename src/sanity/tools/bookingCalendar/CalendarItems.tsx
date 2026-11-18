import { ClockIcon } from "@sanity/icons/Clock";
import { Badge, Card, Flex, Stack, Text } from "@sanity/ui";
import { useIntentLink } from "sanity/router";

import { BOOKING_STATUS_META } from "../../lib/constants";
import { formatMinutesRange, formatTimeRange } from "../../lib/dates";
import { timeOffWindow, type TimeOffEntry } from "../../lib/hours";
import type { CalendarBooking } from "./useCalendarData";

/** One appointment. Opens the booking in the editor. */
export function BookingCard({ booking, overlaps }: { booking: CalendarBooking; overlaps: boolean }) {
  const { href, onClick } = useIntentLink({ intent: "edit", params: { id: booking._id, type: "booking" } });
  const meta = BOOKING_STATUS_META[booking.status];
  const inactive = booking.status === "cancelled";

  return (
    <Card
      as="a"
      href={href}
      onClick={onClick}
      padding={3}
      radius={2}
      border
      __unstable_focusRing
      tone={meta.cardTone}
      style={{ textDecoration: "none", opacity: inactive ? 0.7 : 1 }}
    >
      <Stack gap={2}>
        <Text size={1} weight="semibold" style={{ textDecoration: inactive ? "line-through" : undefined }}>
          {formatTimeRange(booking.time, booking.durationMinutes)}
        </Text>
        <Text size={1} textOverflow="ellipsis">
          {booking.customerName?.trim() || "Unnamed client"}
        </Text>
        <Text size={1} muted textOverflow="ellipsis">
          {booking.serviceName?.trim() || "Service"}
        </Text>
        <Flex gap={1} wrap="wrap">
          <Badge tone={meta.tone} title={meta.description}>
            {meta.title}
          </Badge>
          {overlaps ? (
            <Badge tone="critical" title="Overlaps another active booking on this day">
              Overlap
            </Badge>
          ) : null}
        </Flex>
      </Stack>
    </Card>
  );
}

/** A block of time off. Opens the time-off entry in the editor. */
export function TimeOffCard({ entry }: { entry: TimeOffEntry & { _id: string } }) {
  const { href, onClick } = useIntentLink({ intent: "edit", params: { id: entry._id, type: "timeOff" } });
  const blocked = timeOffWindow(entry);

  return (
    <Card
      as="a"
      href={href}
      onClick={onClick}
      padding={3}
      radius={2}
      border
      __unstable_focusRing
      tone="neutral"
      style={{ textDecoration: "none" }}
    >
      <Flex gap={2} align="flex-start">
        <Text size={1} muted>
          <ClockIcon aria-hidden="true" />
        </Text>
        <Stack gap={2} flex={1} style={{ minWidth: 0 }}>
          <Text size={1} weight="semibold">
            {blocked ? formatMinutesRange(blocked.start, blocked.end) : "All day"}
          </Text>
          <Text size={1} muted textOverflow="ellipsis">
            Time off{entry.reason?.trim() ? ` · ${entry.reason.trim()}` : ""}
          </Text>
        </Stack>
      </Flex>
    </Card>
  );
}
