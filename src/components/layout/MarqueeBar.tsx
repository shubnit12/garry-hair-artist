"use client";

import { useState, type ReactNode } from "react";

import { PauseIcon, PlayIcon } from "@/components/ui/icons";

/**
 * Frame for the scrolling announcement bar. Besides the hover pause, a toggle
 * lets keyboard and touch users stop the motion (WCAG 2.2.2). The toggle is
 * hidden when the OS asks for reduced motion: the track is static then.
 */
export function MarqueeBar({ summary, children }: { summary: string; children: ReactNode }) {
  const [paused, setPaused] = useState(false);

  return (
    <div className="flex border-b border-ink-line bg-ink text-[12px] tracking-[0.04em] text-paper sm:text-[13px]">
      <p className="sr-only">{summary}</p>
      <div className="group min-w-0 flex-1 overflow-hidden py-2">
        <div
          aria-hidden="true"
          className={`flex w-max animate-marquee group-hover:[animation-play-state:paused] ${
            paused ? "[animation-play-state:paused]" : ""
          }`}
        >
          {children}
        </div>
      </div>
      <button
        type="button"
        aria-pressed={paused}
        aria-label="Pause announcements"
        onClick={() => setPaused((value) => !value)}
        className="flex min-w-10 shrink-0 items-center justify-center border-l border-ink-line text-paper/80 transition-colors hover:text-paper focus-visible:text-paper focus-visible:-outline-offset-4 motion-reduce:hidden"
      >
        {paused ? <PlayIcon size={14} /> : <PauseIcon size={14} />}
      </button>
    </div>
  );
}
