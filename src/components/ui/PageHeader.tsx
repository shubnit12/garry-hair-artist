import type { ReactNode } from "react";

import { DisplayHeading, Eyebrow } from "./Typography";

/**
 * Standard top-of-page header for inner pages: small eyebrow, large
 * blackletter title and an optional intro, followed by a hairline rule.
 */
export function PageHeader({
  eyebrow,
  title,
  intro,
  children,
}: {
  eyebrow?: string;
  title: string;
  intro?: string;
  /** Optional extra content (e.g. buttons) under the intro. */
  children?: ReactNode;
}) {
  return (
    <header className="container-site border-b border-ink-line pb-10 pt-12 sm:pb-14 sm:pt-16 lg:pt-20">
      {eyebrow ? <Eyebrow className="mb-5 text-smoke">{eyebrow}</Eyebrow> : null}
      <DisplayHeading as="h1" size="xl" className="max-w-5xl">
        {title}
      </DisplayHeading>
      {intro ? (
        <p className="mt-6 max-w-2xl text-sm leading-relaxed text-paper/85 sm:text-base">{intro}</p>
      ) : null}
      {children ? <div className="mt-8">{children}</div> : null}
    </header>
  );
}
