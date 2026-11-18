import { FleurIcon } from "@/components/ui/icons";

import { MarqueeBar } from "./MarqueeBar";

/**
 * Scrolling announcement bar. The list is rendered twice and translated by
 * -50% for a seamless loop; the moving tracks are hidden from assistive tech,
 * which reads the announcements once from a visually hidden summary.
 */
export function Marquee({ items }: { items: string[] }) {
  if (!items.length) return null;
  // Repeat short lists so one copy is always wider than the viewport.
  const repeated = Array.from({ length: Math.max(2, Math.ceil(8 / items.length)) }, () => items).flat();

  const track = (hidden: boolean) => (
    <ul
      aria-hidden={hidden || undefined}
      className="flex shrink-0 items-center"
    >
      {repeated.map((item, index) => (
        <li key={`${hidden ? "b" : "a"}-${index}`} className="flex items-center whitespace-nowrap">
          <span className="px-4">{item}</span>
          <FleurIcon size={14} className="opacity-80" />
        </li>
      ))}
    </ul>
  );

  return (
    <MarqueeBar summary={items.join(". ")}>
      {track(false)}
      {track(true)}
    </MarqueeBar>
  );
}
