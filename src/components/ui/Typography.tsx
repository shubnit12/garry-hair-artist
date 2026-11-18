import type { ElementType, ReactNode } from "react";

/**
 * Blackletter display heading. Sizes are fluid (clamp) so headings scale from
 * phones to large desktops without breakpoints.
 */
const displaySizes = {
  md: "text-[clamp(2rem,6vw,3.25rem)] leading-[1.05]",
  lg: "text-[clamp(2.5rem,8vw,4.75rem)] leading-[1]",
  xl: "text-[clamp(3rem,11vw,7.5rem)] leading-[0.95]",
} as const;

export function DisplayHeading({
  as: Tag = "h2",
  size = "lg",
  className = "",
  children,
  id,
}: {
  as?: ElementType;
  size?: keyof typeof displaySizes;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Tag id={id} className={`font-blackletter text-balance ${displaySizes[size]} ${className}`}>
      {children}
    </Tag>
  );
}

/** Small uppercase mono label, e.g. "Services · The menu". */
export function Eyebrow({ className = "", children }: { className?: string; children: ReactNode }) {
  return (
    <p className={`font-mono text-[11px] uppercase tracking-[0.2em] ${className}`}>{children}</p>
  );
}

/** Uppercase mono title used for small headings (e.g. "THE CUT DEFINES YOU"). */
export function MonoTitle({
  as: Tag = "h3",
  className = "",
  children,
  id,
}: {
  as?: ElementType;
  className?: string;
  children: ReactNode;
  id?: string;
}) {
  return (
    <Tag id={id} className={`font-mono text-base uppercase tracking-[0.14em] sm:text-lg ${className}`}>
      {children}
    </Tag>
  );
}

/** Body copy split into paragraphs. */
export function Prose({
  paragraphs,
  className = "",
}: {
  paragraphs: string[];
  className?: string;
}) {
  return (
    <div className={`space-y-4 text-sm leading-relaxed sm:text-[15px] ${className}`}>
      {paragraphs.map((paragraph, index) => (
        <p key={index}>{paragraph}</p>
      ))}
    </div>
  );
}
