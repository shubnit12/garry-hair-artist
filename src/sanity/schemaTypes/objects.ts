import { defineArrayMember, defineField, defineType } from "sanity";

/** Reusable field helpers and object types shared across documents. */

export const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "07:00", "07:15", … "22:00" — friendly dropdown for HH:mm fields. */
export const TIME_OPTIONS = Array.from({ length: (22 - 7) * 4 + 1 }, (_, index) => {
  const minutes = 7 * 60 + index * 15;
  const value = `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
  const hour = Math.floor(minutes / 60);
  const title = `${hour % 12 || 12}:${String(minutes % 60).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`;
  return { title, value };
});

export function timeField(
  name: string,
  title: string,
  options: { description?: string; required?: boolean } = {},
) {
  return defineField({
    name,
    title,
    description: options.description,
    type: "string",
    options: { list: TIME_OPTIONS },
    validation: (rule) => {
      const format = rule.custom((value) =>
        value === undefined || TIME_PATTERN.test(String(value)) ? true : "Use 24-hour HH:mm, e.g. 09:30",
      );
      return options.required ? format.required() : format;
    },
  });
}

/** Image field with hotspot + required alt text (accessibility & SEO). */
export function imageField(name: string, title: string, options: { required?: boolean; description?: string } = {}) {
  return defineField({
    name,
    title,
    description: options.description,
    type: "image",
    options: { hotspot: true },
    fields: [
      defineField({
        name: "alt",
        title: "Alt text",
        description: "Describe the image for screen readers and search engines.",
        type: "string",
        validation: (rule) => rule.max(160),
      }),
    ],
    validation: options.required ? (rule) => rule.required() : undefined,
  });
}

export const seoType = defineType({
  name: "seo",
  title: "SEO",
  type: "object",
  options: { collapsible: true, collapsed: true },
  fields: [
    defineField({
      name: "title",
      title: "Page title",
      description: "Shown in browser tabs and Google results. Ideally under 60 characters.",
      type: "string",
      validation: (rule) => rule.max(70).warning("Long titles get cut off in search results"),
    }),
    defineField({
      name: "description",
      title: "Meta description",
      description: "Summary shown under the title in Google. Aim for 120–160 characters.",
      type: "text",
      rows: 3,
      validation: (rule) => rule.max(200).warning("Long descriptions get cut off in search results"),
    }),
  ],
});

export const WEEKDAY_OPTIONS = [
  { title: "Monday", value: "monday" },
  { title: "Tuesday", value: "tuesday" },
  { title: "Wednesday", value: "wednesday" },
  { title: "Thursday", value: "thursday" },
  { title: "Friday", value: "friday" },
  { title: "Saturday", value: "saturday" },
  { title: "Sunday", value: "sunday" },
];

export const openingHoursType = defineType({
  name: "openingHours",
  title: "Opening hours",
  type: "object",
  fields: [
    defineField({
      name: "day",
      type: "string",
      options: { list: WEEKDAY_OPTIONS },
      validation: (rule) => rule.required(),
    }),
    defineField({ name: "closed", title: "Closed all day", type: "boolean", initialValue: false }),
    { ...timeField("open", "Opens"), hidden: ({ parent }: { parent?: { closed?: boolean } }) => Boolean(parent?.closed) },
    { ...timeField("close", "Closes"), hidden: ({ parent }: { parent?: { closed?: boolean } }) => Boolean(parent?.closed) },
  ],
  validation: (rule) =>
    rule.custom((value: { closed?: boolean; open?: string; close?: string } | undefined) => {
      if (!value || value.closed) return true;
      if (!value.open || !value.close) return "Set opening and closing times, or mark the day as closed";
      return value.open < value.close ? true : "Closing time must be after opening time";
    }),
  preview: {
    select: { day: "day", closed: "closed", open: "open", close: "close" },
    prepare: ({ day, closed, open, close }) => ({
      title: day ? day[0].toUpperCase() + day.slice(1) : "Day",
      subtitle: closed ? "Closed" : `${open ?? "?"} – ${close ?? "?"}`,
    }),
  },
});

export const valueItemType = defineType({
  name: "valueItem",
  title: "Value",
  type: "object",
  fields: [
    defineField({ name: "title", type: "string", validation: (rule) => rule.required().max(40) }),
    defineField({ name: "text", type: "text", rows: 2, validation: (rule) => rule.required().max(200) }),
  ],
});

export const stringList = (name: string, title: string, description?: string) =>
  defineField({
    name,
    title,
    description,
    type: "array",
    of: [defineArrayMember({ type: "string" })],
  });
