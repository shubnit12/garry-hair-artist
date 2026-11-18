import { CalendarIcon } from "@sanity/icons/Calendar";
import type { Tool } from "sanity";

import { BookingCalendar } from "./BookingCalendar";

/** Week view of bookings and time off, registered in sanity.config.ts. */
export const bookingCalendarTool: Tool = {
  name: "calendar",
  title: "Calendar",
  icon: CalendarIcon,
  component: BookingCalendar,
};
