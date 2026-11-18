"use client";

import { useId, type ReactNode, type Ref } from "react";

import { Eyebrow } from "@/components/ui/Typography";

/** Blackletter step title; focusable so the wizard can move focus to it. */
export const stepHeadingClass =
  "font-blackletter text-balance text-[clamp(2.25rem,7vw,3.25rem)] leading-[1.05] outline-none";

/**
 * White "paper" card for one wizard step: eyebrow, focusable heading, dashed
 * rule, body and an optional action bar.
 */
export function StepFrame({
  eyebrow,
  title,
  description,
  headingRef,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description?: ReactNode;
  headingRef: Ref<HTMLHeadingElement>;
  actions?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section aria-labelledby={headingId} className="theme-paper">
      <div className="px-4 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10">
        <Eyebrow className="text-ash">{eyebrow}</Eyebrow>
        <h2 id={headingId} ref={headingRef} tabIndex={-1} className={`mt-3 ${stepHeadingClass}`}>
          {title}
        </h2>
        {description ? (
          <div className="mt-3 max-w-2xl text-sm leading-relaxed text-ash">{description}</div>
        ) : null}
      </div>
      <hr className="rule-dashed border-t" />
      <div className="px-3 py-6 sm:px-8 sm:py-8 lg:px-10">{children}</div>
      {actions ? (
        <div className="rule-dashed flex flex-col gap-3 border-t px-3 py-5 sm:flex-row-reverse sm:items-center sm:justify-between sm:px-8 lg:px-10">
          {actions}
        </div>
      ) : null}
    </section>
  );
}
