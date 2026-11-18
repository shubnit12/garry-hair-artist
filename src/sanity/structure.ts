import { AddIcon } from "@sanity/icons/Add";
import { ArchiveIcon } from "@sanity/icons/Archive";
import { BellIcon } from "@sanity/icons/Bell";
import { CalendarIcon } from "@sanity/icons/Calendar";
import { ClockIcon } from "@sanity/icons/Clock";
import { CloseCircleIcon } from "@sanity/icons/CloseCircle";
import { CogIcon } from "@sanity/icons/Cog";
import { DocumentsIcon } from "@sanity/icons/Documents";
import { EnvelopeIcon } from "@sanity/icons/Envelope";
import { InboxIcon } from "@sanity/icons/Inbox";
import { ListIcon } from "@sanity/icons/List";
import { SunIcon } from "@sanity/icons/Sun";
import type { ComponentType } from "react";
import type { ListItemBuilder, StructureBuilder, StructureResolver } from "sanity/structure";

import { NewBookingPane } from "./components/NewPrivateDocument";
import { DEFAULT_BOOKING_STATUS, STUDIO_API_VERSION } from "./lib/constants";
import { businessToday } from "./lib/dates";

/**
 * Studio sidebar, ordered by what Garry checks most: bookings first, then
 * time off and messages, then website content, then settings.
 *
 * Booking lists are resolved when opened, so "today" is always the current
 * date in Surrey, BC — even if the Studio tab stays open overnight.
 *
 * Booking and message lists have no "Create" button (`initialValueTemplates([])`):
 * those documents need private IDs, so bookings are added with "New booking".
 */

type Ordering = { field: string; direction: "asc" | "desc" }[];

const SOONEST_FIRST: Ordering = [
  { field: "date", direction: "asc" },
  { field: "time", direction: "asc" },
];
const LATEST_FIRST: Ordering = [
  { field: "date", direction: "desc" },
  { field: "time", direction: "desc" },
];
/** A booking without a status counts as confirmed, like everywhere else. */
const STATUS = `coalesce(status, "${DEFAULT_BOOKING_STATUS}")`;
const ACTIVE = `${STATUS} in ["pending", "confirmed"]`;

type BookingListSpec = {
  id: string;
  title: string;
  icon: ComponentType;
  /** GROQ condition; `$today` is today's date in the business timezone. */
  filter: string;
  ordering: Ordering;
};

const BOOKING_LISTS: BookingListSpec[] = [
  { id: "bookings-today", title: "Today", icon: SunIcon, filter: "date == $today", ordering: SOONEST_FIRST },
  {
    id: "bookings-upcoming",
    title: "Upcoming",
    icon: CalendarIcon,
    filter: `date >= $today && ${ACTIVE}`,
    ordering: SOONEST_FIRST,
  },
  {
    id: "bookings-pending",
    title: "Pending confirmation",
    icon: BellIcon,
    filter: `${STATUS} == "pending"`,
    ordering: SOONEST_FIRST,
  },
  { id: "bookings-past", title: "Past", icon: ArchiveIcon, filter: "date < $today", ordering: LATEST_FIRST },
  {
    id: "bookings-cancelled",
    title: "Cancelled",
    icon: CloseCircleIcon,
    filter: `status == "cancelled"`,
    ordering: LATEST_FIRST,
  },
];

function bookingList(S: StructureBuilder, spec: BookingListSpec): ListItemBuilder {
  return S.listItem()
    .id(spec.id)
    .title(spec.title)
    .icon(spec.icon)
    .child(() =>
      S.documentList()
        .id(spec.id)
        .title(spec.title)
        .schemaType("booking")
        .apiVersion(STUDIO_API_VERSION)
        .filter(`_type == "booking" && (${spec.filter})`)
        .params({ today: businessToday() })
        .defaultOrdering(spec.ordering)
        .initialValueTemplates([]),
    );
}

function bookings(S: StructureBuilder): ListItemBuilder {
  return S.listItem()
    .id("bookings")
    .title("Bookings")
    .icon(CalendarIcon)
    .child(
      S.list()
        .id("bookings")
        .title("Bookings")
        .items([
          S.listItem()
            .id("bookings-new")
            .title("New booking")
            .icon(AddIcon)
            .child(S.component(NewBookingPane).id("bookings-new").title("New booking")),
          S.divider(),
          ...BOOKING_LISTS.map((spec) => bookingList(S, spec)),
          S.divider(),
          S.listItem()
            .id("bookings-all")
            .title("All bookings")
            .icon(ListIcon)
            .child(
              S.documentTypeList("booking")
                .id("bookings-all")
                .title("All bookings")
                .apiVersion(STUDIO_API_VERSION)
                .defaultOrdering(LATEST_FIRST)
                .initialValueTemplates([]),
            ),
        ]),
    );
}

function messages(S: StructureBuilder): ListItemBuilder {
  const list = (id: string, title: string, filter: string) =>
    S.documentList()
      .id(id)
      .title(title)
      .schemaType("contactMessage")
      .apiVersion(STUDIO_API_VERSION)
      .filter(`_type == "contactMessage" && (${filter})`)
      .defaultOrdering([
        { field: "createdAt", direction: "desc" },
        { field: "_createdAt", direction: "desc" },
      ])
      .initialValueTemplates([]);

  return S.listItem()
    .id("messages")
    .title("Messages")
    .icon(EnvelopeIcon)
    .child(
      S.list()
        .id("messages")
        .title("Messages")
        .items([
          S.listItem()
            .id("messages-new")
            .title("New")
            .icon(InboxIcon)
            .child(list("messages-new", "New messages", `coalesce(status, "new") == "new"`)),
          S.listItem()
            .id("messages-all")
            .title("All")
            .icon(DocumentsIcon)
            .child(list("messages-all", "All messages", "true")),
        ]),
    );
}

/** A singleton opens straight into its one document (fixed _id = type name). */
function singleton(S: StructureBuilder, type: string, title: string): ListItemBuilder {
  return S.listItem()
    .id(type)
    .title(title)
    .schemaType(type)
    .child(S.document().schemaType(type).documentId(type).title(title));
}

function orderedTypeList(S: StructureBuilder, type: string, title: string, ordering: Ordering) {
  return S.listItem()
    .id(type)
    .title(title)
    .schemaType(type)
    .child(S.documentTypeList(type).title(title).apiVersion(STUDIO_API_VERSION).defaultOrdering(ordering));
}

const BY_SORT_ORDER: Ordering = [{ field: "order", direction: "asc" }];

export const structure: StructureResolver = (S) =>
  S.list()
    .title("Garry Hair Artist")
    .items([
      bookings(S),
      S.listItem()
        .id("timeOff")
        .title("Time off")
        .icon(ClockIcon)
        .schemaType("timeOff")
        .child(
          S.documentTypeList("timeOff")
            .title("Time off")
            .apiVersion(STUDIO_API_VERSION)
            .defaultOrdering([{ field: "startDate", direction: "desc" }]),
        ),
      messages(S),
      S.divider(),
      orderedTypeList(S, "service", "Services", [...BY_SORT_ORDER, { field: "name", direction: "asc" }]),
      orderedTypeList(S, "galleryItem", "Portfolio", BY_SORT_ORDER),
      orderedTypeList(S, "testimonial", "Testimonials", BY_SORT_ORDER),
      S.divider(),
      singleton(S, "homePage", "Home page"),
      singleton(S, "aboutPage", "About page"),
      singleton(S, "servicesPage", "Services page"),
      singleton(S, "contactPage", "Contact page"),
      singleton(S, "privacyPage", "Privacy policy"),
      S.divider(),
      S.listItem()
        .id("settings")
        .title("Settings")
        .icon(CogIcon)
        .child(
          S.list()
            .id("settings")
            .title("Settings")
            .items([
              singleton(S, "bookingSettings", "Booking settings"),
              singleton(S, "siteSettings", "Site settings"),
            ]),
        ),
    ]);
