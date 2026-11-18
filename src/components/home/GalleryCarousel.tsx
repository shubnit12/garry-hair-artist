"use client";

import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

import { SiteImage } from "@/components/ui/SiteImage";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/ui/icons";
import type { GalleryItem } from "@/lib/content/types";

type Edges = { atStart: boolean; atEnd: boolean };

function scrollBehavior(): ScrollBehavior {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth";
}

const controlClass =
  "absolute top-1/2 z-10 flex size-11 -translate-y-1/2 items-center justify-center bg-ink text-paper transition-[background-color,color,opacity] duration-200 hover:bg-paper hover:text-ink focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-paper aria-disabled:cursor-default aria-disabled:opacity-30 aria-disabled:hover:bg-ink aria-disabled:hover:text-paper";

/**
 * Horizontal portfolio carousel: a native scroll-snap track (touch, trackpad
 * and keyboard scrolling all work) with square prev/next controls overlaid on
 * the edges, as in the reference. Roughly 1.15 / 2.2 / 2.5 items are visible on
 * phones / tablets / desktops so the cut-off item hints at more.
 */
export function GalleryCarousel({
  items,
  label,
  className = "",
}: {
  items: GalleryItem[];
  label: string;
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const trackId = useId();
  const [edges, setEdges] = useState<Edges>({ atStart: true, atEnd: items.length <= 1 });
  const [announcement, setAnnouncement] = useState("");

  const measure = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    const max = track.scrollWidth - track.clientWidth;
    const next = { atStart: track.scrollLeft <= 1, atEnd: track.scrollLeft >= max - 1 };
    setEdges((prev) => (prev.atStart === next.atStart && prev.atEnd === next.atEnd ? prev : next));
  }, []);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    let frame = 0;
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(measure);
    };
    // ResizeObserver fires once on observe, which also takes the initial measurement.
    const observer = new ResizeObserver(schedule);
    observer.observe(track);
    track.addEventListener("scroll", schedule, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      track.removeEventListener("scroll", schedule);
    };
  }, [measure]);

  /** Scrolls so the previous/next item is flush with the left edge of the track. */
  const step = useCallback(
    (direction: 1 | -1) => {
      const track = trackRef.current;
      if (!track) return;
      const slides = Array.from(track.children) as HTMLElement[];
      const position = track.scrollLeft;
      if (direction === 1 && position >= track.scrollWidth - track.clientWidth - 1) return;
      const index =
        direction === 1
          ? slides.findIndex((slide) => slide.offsetLeft > position + 1)
          : slides.findLastIndex((slide) => slide.offsetLeft < position - 1);
      if (index < 0) return;
      track.scrollTo({ left: slides[index].offsetLeft, behavior: scrollBehavior() });
      setAnnouncement(`Image ${index + 1} of ${items.length}: ${items[index].title}`);
    },
    [items],
  );

  const scrollToEdge = useCallback((edge: "start" | "end") => {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: edge === "start" ? 0 : track.scrollWidth, behavior: scrollBehavior() });
  }, []);

  const onKeyDown = (event: KeyboardEvent<HTMLUListElement>) => {
    const actions: Record<string, () => void> = {
      ArrowRight: () => step(1),
      ArrowLeft: () => step(-1),
      Home: () => scrollToEdge("start"),
      End: () => scrollToEdge("end"),
    };
    const action = actions[event.key];
    if (!action || event.target !== event.currentTarget) return;
    event.preventDefault();
    action();
  };

  if (!items.length) return null;

  const scrollable = !(edges.atStart && edges.atEnd);

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      className={`relative ${className}`}
    >
      <ul
        ref={trackRef}
        id={trackId}
        tabIndex={0}
        onKeyDown={onKeyDown}
        className="scrollbar-none relative flex snap-x snap-mandatory gap-1.5 overflow-x-auto overscroll-x-contain focus-visible:outline-offset-4"
      >
        {items.map((item, index) => (
          <li
            key={item.id}
            aria-label={`${index + 1} of ${items.length}`}
            className="w-[calc((100%-0.375rem)/1.15)] shrink-0 snap-start sm:w-[calc((100%-0.75rem)/2.2)] lg:w-[calc((100%-0.75rem)/2.5)]"
          >
            <figure className="relative aspect-[3/4.2] max-h-[85svh] overflow-hidden bg-ink-soft">
              <SiteImage
                image={item.image}
                fill
                sizes="(min-width: 1440px) 552px, (min-width: 1024px) 38vw, (min-width: 640px) 44vw, 87vw"
              />
              <figcaption className="absolute inset-x-0 bottom-0 bg-linear-to-t from-ink/90 via-ink/55 to-transparent px-4 pb-4 pt-20 sm:px-5 sm:pb-5">
                <p className="text-[12px] uppercase tracking-[0.16em] sm:text-[13px]">{item.title}</p>
                {item.caption ? (
                  <p className="mt-1 text-[12px] leading-snug text-paper/85">{item.caption}</p>
                ) : null}
              </figcaption>
            </figure>
          </li>
        ))}
      </ul>

      {scrollable ? (
        <>
          <button
            type="button"
            aria-controls={trackId}
            aria-label="Previous image"
            aria-disabled={edges.atStart}
            onClick={() => {
              if (!edges.atStart) step(-1);
            }}
            className={`${controlClass} left-2 sm:left-3`}
          >
            <ChevronLeftIcon size={18} />
          </button>
          <button
            type="button"
            aria-controls={trackId}
            aria-label="Next image"
            aria-disabled={edges.atEnd}
            onClick={() => {
              if (!edges.atEnd) step(1);
            }}
            className={`${controlClass} right-2 sm:right-3`}
          >
            <ChevronRightIcon size={18} />
          </button>
        </>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {announcement}
      </p>
    </div>
  );
}
