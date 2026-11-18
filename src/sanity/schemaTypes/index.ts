import type { SchemaTypeDefinition } from "sanity";

import {
  bookingDayLockType,
  bookingType,
  contactMessageType,
  galleryItemType,
  serviceType,
  testimonialType,
  timeOffType,
} from "./documents";
import { openingHoursType, seoType, valueItemType } from "./objects";
import { singletonTypes } from "./singletons";

export const schemaTypes: SchemaTypeDefinition[] = [
  // Objects
  seoType,
  openingHoursType,
  valueItemType,
  // Singletons
  ...singletonTypes,
  // Collections
  serviceType,
  galleryItemType,
  testimonialType,
  bookingType,
  timeOffType,
  contactMessageType,
  bookingDayLockType,
];

/** Document types that must only ever have one instance (fixed _id = type name). */
export const SINGLETON_TYPES: ReadonlySet<string> = new Set(singletonTypes.map((type) => type.name));
