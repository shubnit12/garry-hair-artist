import type { ValidContactMessage } from "@/lib/booking/schema";
import { siteUrl } from "@/lib/env";
import { BUSINESS_LOCALE, BUSINESS_TIMEZONE } from "@/lib/site";

import { button, detailsTable, emailLayout, escapeHtml, mutedParagraph, paragraph, type DetailRow } from "./layout";

/**
 * Owner notification for a website contact-form message.
 * Every user-supplied value is escaped (via the layout helpers or escapeHtml).
 */

export const GENERAL_TOPIC = "General question";

export type ContactEmailInput = Pick<ValidContactMessage, "name" | "email" | "phone" | "topic" | "message"> & {
  receivedAt: Date;
  /** True when the message was also saved to the Studio's Messages inbox. */
  savedToStudio: boolean;
};

export type BuiltEmail = { subject: string; html: string; text: string };

const MONO = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

/** Collapses whitespace so user input can never break the subject line. */
function singleLine(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function formatReceived(date: Date): string {
  return new Intl.DateTimeFormat(BUSINESS_LOCALE, {
    timeZone: BUSINESS_TIMEZONE,
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(date);
}

export function contactEmailSubject(input: Pick<ContactEmailInput, "name" | "topic">): string {
  const name = singleLine(input.name).slice(0, 80);
  const topic = singleLine(input.topic);
  const suffix = topic && topic !== GENERAL_TOPIC ? ` · ${topic.slice(0, 80)}` : "";
  return `New message from ${name}${suffix}`;
}

export function buildContactOwnerEmail(input: ContactEmailInput): BuiltEmail {
  const name = singleLine(input.name);
  const topic = singleLine(input.topic) || GENERAL_TOPIC;
  const received = formatReceived(input.receivedAt);
  const message = input.message.trim();

  const rows: DetailRow[] = [
    { label: "Name", value: name },
    { label: "Email", value: input.email },
    ...(input.phone ? [{ label: "Phone", value: input.phone }] : []),
    { label: "Topic", value: topic },
    { label: "Received", value: received },
  ];

  const replySubject = `Re: ${topic === GENERAL_TOPIC ? "Your message" : topic}`;
  const mailto = `mailto:${input.email}?subject=${encodeURIComponent(replySubject)}`;

  const messageBlock = `
  <div style="margin:0 0 24px;padding:16px 18px;border-left:3px solid #111111;background:#f5f4f2;font:14px/1.7 ${MONO};color:#111111;white-space:pre-wrap;word-break:break-word;">${escapeHtml(message).replaceAll("\n", "<br>")}</div>`;

  const html = emailLayout({
    preheader: `${name}: ${singleLine(message).slice(0, 110)}`,
    heading: "New website message",
    bodyHtml: [
      paragraph(`${name} sent a message through the contact form on your website.`),
      detailsTable(rows),
      messageBlock,
      button(`Reply to ${name.split(" ")[0] || name}`, mailto),
      mutedParagraph("You can also reply to this email directly — it goes straight to the sender."),
      input.savedToStudio
        ? mutedParagraph("A copy is saved in your Studio under Messages.")
        : "",
    ].join(""),
    footerLines: [`Sent from the contact form at ${siteUrl}/contact`],
  });

  const text = [
    "New website message",
    "",
    ...rows.map((row) => `${row.label}: ${row.value}`),
    "",
    "Message:",
    message,
    "",
    "Reply to this email to respond directly to the sender.",
    input.savedToStudio ? "A copy is saved in your Studio under Messages." : "",
    "",
    `Sent from the contact form at ${siteUrl}/contact`,
  ]
    .filter((line, index, all) => !(line === "" && all[index - 1] === ""))
    .join("\n");

  return { subject: contactEmailSubject(input), html, text };
}
