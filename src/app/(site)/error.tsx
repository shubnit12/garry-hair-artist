"use client";

import { useEffect, useRef } from "react";

import { ArrowLink, Button, ButtonLink } from "@/components/ui/Button";
import { Eyebrow } from "@/components/ui/Typography";
import { BOOK_HREF } from "@/lib/site";

/**
 * Error boundary for public pages (rendered inside the site chrome). Shows a
 * friendly message only — never technical details — and lets the visitor
 * retry, which re-fetches and re-renders the failed segment.
 */
export default function SiteError({ retry }: { error: unknown; retry: () => void }) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  // Move focus to the message so keyboard and screen-reader users know the page changed.
  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <section
      aria-labelledby="error-title"
      className="container-site pb-20 pt-14 sm:pb-28 sm:pt-20 lg:pt-28"
    >
      <Eyebrow className="text-smoke">Something went wrong</Eyebrow>
      <h1
        id="error-title"
        ref={headingRef}
        tabIndex={-1}
        className="mt-5 max-w-4xl font-blackletter text-[clamp(3rem,11vw,7.5rem)] leading-[0.95] text-balance outline-none"
      >
        A Small Snag
      </h1>
      <p className="mt-6 max-w-xl text-sm leading-relaxed text-paper/85 sm:text-base">
        This page didn&apos;t load properly. Please try again — and if it keeps happening, you can
        still book online or get in touch.
      </p>
      <div className="mt-10 flex flex-col gap-3 min-[420px]:flex-row min-[420px]:flex-wrap">
        <Button variant="paper" size="lg" onClick={() => retry()}>
          Try again
        </Button>
        <ButtonLink href={BOOK_HREF} variant="outline" size="lg">
          Book an appointment
        </ButtonLink>
      </div>
      <div className="mt-8 flex flex-wrap gap-x-8">
        <ArrowLink href="/" className="min-h-11">
          Back to home
        </ArrowLink>
        <ArrowLink href="/contact" className="min-h-11">
          Contact
        </ArrowLink>
      </div>
    </section>
  );
}
