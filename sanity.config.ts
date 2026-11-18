"use client";

/**
 * Sanity Studio configuration, mounted at /studio by
 * src/app/studio/[[...tool]]/page.tsx.
 */

import { visionTool } from "@sanity/vision";
import { defineConfig } from "sanity";
import { structureTool } from "sanity/structure";

import { sanityApiVersion, sanityDataset, sanityProjectId } from "./src/lib/env";
import { PRIVATE_DOCUMENT_TYPES } from "./src/lib/private-ids";
import { bookingStatusActions, BookingStatusBadge } from "./src/sanity/actions";
import { StudioIcon } from "./src/sanity/components/StudioIcon";
import { SINGLETON_TYPES, schemaTypes } from "./src/sanity/schemaTypes";
import { structure } from "./src/sanity/structure";
import { bookingCalendarTool } from "./src/sanity/tools/bookingCalendar";

const HIDDEN_TYPES = new Set(["bookingDayLock"]);
const SINGLETON_ACTIONS = new Set(["publish", "discardChanges", "restore"]);

export default defineConfig({
  name: "garry-hair-artist",
  title: "Garry Hair Artist",
  icon: StudioIcon,
  basePath: "/studio",
  projectId: sanityProjectId || "missing",
  dataset: sanityDataset,

  schema: {
    types: schemaTypes,
    // Singletons and internal types can't be created from the "+ New" menu.
    templates: (templates) =>
      templates.filter(({ schemaType }) => !SINGLETON_TYPES.has(schemaType) && !HIDDEN_TYPES.has(schemaType)),
  },

  document: {
    // Bookings and messages need private IDs (src/lib/private-ids.ts), which the
    // built-in "Create" menus can't assign. Bookings get their own "New booking"
    // buttons (Bookings list, Calendar); messages only come from the website.
    newDocumentOptions: (prev) => prev.filter(({ templateId }) => !PRIVATE_DOCUMENT_TYPES.has(templateId)),

    actions: (input, context) => {
      // Singletons can't be duplicated or deleted.
      if (SINGLETON_TYPES.has(context.schemaType)) {
        return input.filter(({ action }) => action && SINGLETON_ACTIONS.has(action));
      }
      // "Duplicate" would copy client details to a new public ID.
      const actions = PRIVATE_DOCUMENT_TYPES.has(context.schemaType)
        ? input.filter(({ action }) => action !== "duplicate")
        : input;
      // Bookings get quick status buttons first (not while viewing an old revision);
      // the default actions stay available.
      if (context.schemaType === "booking" && context.versionType !== "revision") {
        return [...bookingStatusActions, ...actions];
      }
      return actions;
    },
    badges: (input, context) => (context.schemaType === "booking" ? [BookingStatusBadge, ...input] : input),
  },

  // Keep the Studio simple for a single editor: no release planning or scheduled drafts.
  releases: { enabled: false },
  scheduledDrafts: { enabled: false },

  plugins: [
    structureTool({ structure, title: "Content" }),
    // The GROQ playground is a developer tool; only show it when running locally.
    ...(process.env.NODE_ENV === "development" ? [visionTool({ defaultApiVersion: sanityApiVersion })] : []),
  ],

  // Calendar sits right after the content tool in the navbar.
  tools: (tools) => {
    const index = tools.findIndex((tool) => tool.name === "structure");
    return index === -1
      ? [...tools, bookingCalendarTool]
      : [...tools.slice(0, index + 1), bookingCalendarTool, ...tools.slice(index + 1)];
  },
});
