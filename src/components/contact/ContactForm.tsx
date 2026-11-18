"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import {
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type ChangeEvent,
  type FocusEvent,
  type FormEvent,
  type ReactNode,
  type SelectHTMLAttributes,
} from "react";
import { flushSync } from "react-dom";

import { Button, ButtonLink } from "@/components/ui/Button";
import { CheckIcon, ChevronRightIcon } from "@/components/ui/icons";
import { contactMessageSchema, fieldErrorsFrom } from "@/lib/booking/schema";
import type { ApiError } from "@/lib/booking/types";
import { BOOK_HREF } from "@/lib/site";

const FIELDS = ["name", "email", "phone", "topic", "message"] as const;
type Field = (typeof FIELDS)[number];
type FieldErrors = Partial<Record<Field, string>>;
type Status = "idle" | "submitting" | "success" | "error";

const MESSAGE_LIMIT = 2000;
/** Forms left open longer than this skip the fill-time spam check. */
const MAX_TRACKED_AGE_MS = 12 * 60 * 60 * 1000;

const isField = (key: string): key is Field => (FIELDS as readonly string[]).includes(key);

function validateField(field: Field, value: string): string | undefined {
  const result = contactMessageSchema.shape[field].safeParse(value);
  return result.success ? undefined : result.error.issues[0]?.message;
}

function firstErrors(fieldErrors: Record<string, string[]> | undefined): FieldErrors {
  const out: FieldErrors = {};
  for (const [key, messages] of Object.entries(fieldErrors ?? {})) {
    if (isField(key) && messages[0]) out[key] = messages[0];
  }
  return out;
}

/**
 * Contact form with instant validation (shared zod schema), accessible inline
 * errors, spam protection (honeypot + fill time) and graceful failure states.
 * Fields are uncontrolled so browser autofill and back/forward restore work.
 */
export function ContactForm({
  topics,
  fallbackEmail,
}: {
  /** Topic options; the first one is the default ("General question"). */
  topics: string[];
  /** Public business email, offered when sending fails. */
  fallbackEmail: string;
}) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const successRef = useRef<HTMLDivElement>(null);
  const startedAtRef = useRef<number | null>(null);

  const [status, setStatus] = useState<Status>("idle");
  const [errors, setErrors] = useState<FieldErrors>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [messageLength, setMessageLength] = useState(0);
  const [sentTo, setSentTo] = useState<{ name: string; email: string } | null>(null);

  // Record when the form first became usable (spam timing check).
  useEffect(() => {
    startedAtRef.current = Date.now();
  }, []);

  useEffect(() => {
    if (status === "success") successRef.current?.focus();
  }, [status]);

  const fieldId = (field: Field) => `${id}-${field}`;
  const errorId = (field: Field) => `${id}-${field}-error`;

  function focusField(field: Field) {
    const element = formRef.current?.elements.namedItem(field);
    if (element instanceof HTMLElement) element.focus();
  }

  function showErrors(next: FieldErrors) {
    flushSync(() => setErrors(next));
    const first = FIELDS.find((field) => next[field]);
    if (first) focusField(first);
  }

  function handleBlur(event: FocusEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = event.currentTarget.name;
    if (!isField(field)) return;
    const value = event.currentTarget.value;
    // Don't scold people for tabbing through an empty field; validate on submit instead.
    if (!value.trim() && !errors[field]) return;
    const message = validateField(field, value);
    setErrors((current) => ({ ...current, [field]: message }));
  }

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) {
    const field = event.currentTarget.name;
    if (field === "message") setMessageLength(event.currentTarget.value.length);
    // Clear an error as soon as the field becomes valid.
    if (isField(field) && errors[field] && !validateField(field, event.currentTarget.value)) {
      setErrors((current) => ({ ...current, [field]: undefined }));
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "submitting") return;

    const data = new FormData(event.currentTarget);
    const read = (key: string) => {
      const value = data.get(key);
      return typeof value === "string" ? value : "";
    };
    const startedAt = startedAtRef.current;
    const payload = {
      name: read("name"),
      email: read("email"),
      phone: read("phone"),
      topic: read("topic"),
      message: read("message"),
      website: read("website"),
      startedAt:
        startedAt !== null && Date.now() - startedAt < MAX_TRACKED_AGE_MS ? startedAt : undefined,
    };

    // The honeypot is the server's business; never block a person on it.
    const parsed = contactMessageSchema.safeParse({ ...payload, website: undefined });
    if (!parsed.success) {
      setServerError(null);
      setStatus("idle");
      showErrors(firstErrors(fieldErrorsFrom(parsed.error)));
      return;
    }

    setErrors({});
    setServerError(null);
    setStatus("submitting");

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await response.json().catch(() => null)) as Partial<ApiError> | null;

      if (response.ok) {
        setSentTo({ name: parsed.data.name.split(" ")[0] || parsed.data.name, email: parsed.data.email });
        setStatus("success");
        return;
      }

      const fieldErrors = firstErrors(body?.fieldErrors);
      setServerError(
        body?.message ||
          (response.status === 429
            ? "You've sent several messages in a short time. Please wait a few minutes and try again."
            : "Sorry — your message couldn't be sent right now."),
      );
      setStatus("error");
      if (Object.keys(fieldErrors).length) showErrors(fieldErrors);
    } catch {
      setServerError("We couldn't reach the server. Please check your connection and try again.");
      setStatus("error");
    }
  }

  function startOver() {
    flushSync(() => {
      setStatus("idle");
      setSentTo(null);
      setMessageLength(0);
      setErrors({});
      setServerError(null);
    });
    startedAtRef.current = Date.now();
    // The button that was focused is gone; continue from the first field.
    focusField("name");
  }

  if (status === "success" && sentTo) {
    return (
      <div
        ref={successRef}
        role="status"
        tabIndex={-1}
        className="animate-fade-up py-4 outline-none focus-visible:outline-2 focus-visible:outline-offset-4"
      >
        <span className="inline-flex size-12 items-center justify-center rounded-full border border-ink">
          <CheckIcon size={22} />
        </span>
        <h3 className="mt-6 font-mono text-base font-semibold uppercase tracking-[0.14em]">Message sent</h3>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ash sm:text-[15px]">
          Thanks, {sentTo.name} — your message is on its way. I&apos;ll reply to{" "}
          <span className="break-all text-ink">{sentTo.email}</span> as soon as I can.
        </p>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-ash sm:text-[15px]">
          Ready to lock in a time? Appointments are booked online.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <ButtonLink href={BOOK_HREF} variant="ink">
            Book an appointment
          </ButtonLink>
          <Button variant="outline" onClick={startOver}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  const submitting = status === "submitting";
  const remaining = MESSAGE_LIMIT - messageLength;

  return (
    <form
      ref={formRef}
      // Before hydration a native submit must never put the fields in the URL (GET).
      method="post"
      noValidate
      onSubmit={handleSubmit}
      aria-busy={submitting}
      aria-describedby={`${id}-required-note`}
      className="space-y-6"
    >
      <p id={`${id}-required-note`} className="text-xs text-ash">
        All fields are required unless marked optional.
      </p>

      <div className="grid gap-6 sm:grid-cols-2">
        <FormField label="Name" htmlFor={fieldId("name")} error={errors.name} errorId={errorId("name")}>
          <input
            id={fieldId("name")}
            name="name"
            type="text"
            autoComplete="name"
            autoCapitalize="words"
            maxLength={80}
            aria-required="true"
            {...invalidProps(errors.name, errorId("name"))}
            onBlur={handleBlur}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Email" htmlFor={fieldId("email")} error={errors.email} errorId={errorId("email")}>
          <input
            id={fieldId("email")}
            name="email"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoCapitalize="none"
            spellCheck={false}
            maxLength={254}
            aria-required="true"
            {...invalidProps(errors.email, errorId("email"))}
            onBlur={handleBlur}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>
        <FormField
          label="Phone"
          optional
          htmlFor={fieldId("phone")}
          error={errors.phone}
          errorId={errorId("phone")}
        >
          <input
            id={fieldId("phone")}
            name="phone"
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={25}
            {...invalidProps(errors.phone, errorId("phone"))}
            onBlur={handleBlur}
            onChange={handleChange}
            className={inputClasses}
          />
        </FormField>
        <FormField label="Topic" htmlFor={fieldId("topic")} error={errors.topic} errorId={errorId("topic")}>
          <div className="relative">
            {/* Only the preselected topic depends on the URL, so only it waits for search params. */}
            <Suspense
              fallback={
                <TopicSelect
                  topics={topics}
                  defaultValue={topics[0]}
                  id={fieldId("topic")}
                  {...invalidProps(errors.topic, errorId("topic"))}
                  onBlur={handleBlur}
                  onChange={handleChange}
                />
              }
            >
              <TopicSelectFromUrl
                topics={topics}
                id={fieldId("topic")}
                {...invalidProps(errors.topic, errorId("topic"))}
                onBlur={handleBlur}
                onChange={handleChange}
              />
            </Suspense>
            <ChevronRightIcon
              size={16}
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 rotate-90"
            />
          </div>
        </FormField>
      </div>

      <FormField
        label="Message"
        htmlFor={fieldId("message")}
        error={errors.message}
        errorId={errorId("message")}
        hint={
          <span
            aria-hidden="true"
            className={`tabular-nums ${remaining < 0 ? "font-semibold text-danger" : "text-ash"}`}
          >
            {messageLength} / {MESSAGE_LIMIT}
          </span>
        }
      >
        <textarea
          id={fieldId("message")}
          name="message"
          rows={7}
          aria-required="true"
          {...invalidProps(errors.message, errorId("message"), `${id}-message-help`)}
          onBlur={handleBlur}
          onChange={handleChange}
          placeholder="Your hair today, what you'd like to change, any inspiration…"
          className={`${fieldBase} min-h-40 resize-y leading-relaxed`}
        />
        <p id={`${id}-message-help`} className="sr-only">
          Between 10 and {MESSAGE_LIMIT} characters.
        </p>
        <p aria-live="polite" className="sr-only">
          {characterAnnouncement(remaining)}
        </p>
      </FormField>

      {/* Honeypot: hidden from people and assistive tech, irresistible to bots. */}
      <div aria-hidden="true" className="absolute -left-[9999px] top-auto h-px w-px overflow-hidden">
        <label htmlFor={`${id}-website`}>Website</label>
        <input id={`${id}-website`} name="website" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      {status === "error" && serverError ? (
        <div role="alert" className="border border-danger/40 bg-danger/5 px-4 py-4 text-sm leading-relaxed text-danger">
          <p className="font-semibold">{serverError}</p>
          <p className="mt-1 text-ink">
            You can also email me directly at{" "}
            <a href={`mailto:${fallbackEmail}`} className="break-all underline underline-offset-4">
              {fallbackEmail}
            </a>
            .
          </p>
        </div>
      ) : null}

      <div className="flex flex-col gap-5 border-t border-dashed border-paper-line pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-relaxed text-ash sm:max-w-xs">
          Your details are only used to reply to you. See the{" "}
          <Link href="/privacy" className="underline underline-offset-4 hover:text-ink">
            privacy policy
          </Link>
          .
        </p>
        <Button
          type="submit"
          variant="ink"
          size="lg"
          aria-disabled={submitting || undefined}
          className="w-full aria-disabled:cursor-wait aria-disabled:opacity-70 sm:w-auto"
        >
          {submitting ? (
            <>
              <span
                aria-hidden="true"
                className="size-3.5 animate-spin rounded-full border-2 border-current border-r-transparent"
              />
              Sending…
            </>
          ) : (
            <>
              Send message
              <ChevronRightIcon size={14} />
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

/** 16px text everywhere so iOS Safari never zooms into a focused field. */
const fieldBase =
  "block w-full rounded-none border border-paper-line bg-paper px-4 py-3 text-base text-ink " +
  "placeholder:text-[#737373] transition-colors hover:border-ink focus:border-ink " +
  "aria-[invalid=true]:border-danger";
const inputClasses = `${fieldBase} min-h-12`;

function invalidProps(error: string | undefined, errorId: string, describedBy?: string) {
  const ids = [describedBy, error ? errorId : undefined].filter(Boolean).join(" ");
  return {
    "aria-invalid": error ? (true as const) : undefined,
    "aria-describedby": ids || undefined,
  };
}

/** Screen-reader updates only as the limit approaches, not on every keystroke. */
function characterAnnouncement(remaining: number): string {
  if (remaining < 0) return `${-remaining} characters over the limit`;
  if (remaining <= 20) return `${remaining} characters remaining`;
  if (remaining <= 100) return `About ${Math.ceil(remaining / 10) * 10} characters remaining`;
  return "";
}

function FormField({
  label,
  htmlFor,
  optional = false,
  error,
  errorId,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  optional?: boolean;
  error?: string;
  errorId: string;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between gap-4">
        <label htmlFor={htmlFor} className="text-xs font-semibold uppercase tracking-[0.16em]">
          {label}
          {optional ? <span className="ml-2 font-normal normal-case tracking-normal text-ash">(optional)</span> : null}
        </label>
        {hint ? <span className="text-xs">{hint}</span> : null}
      </div>
      {children}
      {error ? (
        <p id={errorId} className="mt-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

type TopicSelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, "children" | "name" | "className"> & {
  topics: string[];
};

function TopicSelect({ topics, ...props }: TopicSelectProps) {
  return (
    <select {...props} name="topic" className={`${inputClasses} cursor-pointer appearance-none pr-12`}>
      {topics.map((topic) => (
        <option key={topic} value={topic}>
          {topic}
        </option>
      ))}
    </select>
  );
}

/** Preselects the topic from `/contact?topic=<service name>` (e.g. "Enquire" links). */
function TopicSelectFromUrl(props: TopicSelectProps) {
  const requested = useSearchParams().get("topic")?.trim().toLowerCase();
  const match = requested ? props.topics.find((topic) => topic.toLowerCase() === requested) : undefined;
  return <TopicSelect {...props} defaultValue={match ?? props.topics[0]} />;
}
