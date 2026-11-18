import Link, { type LinkProps } from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";

import { ChevronRightIcon } from "./icons";

/**
 * Button styles.
 * - `ink`:   black fill, white text — use on white "paper" panels (the reference "Book Now").
 * - `paper`: white fill, black text — use on the dark canvas.
 * - `outline`: hairline border in the current text colour.
 *
 * The global focus ring is `currentColor`, offset onto the surrounding canvas.
 * For filled variants that would be the canvas colour itself (white on white,
 * black on black), so they draw the ring in their fill colour instead — the
 * opposite of the canvas they are meant for (18.9:1 either way).
 */
export type ButtonVariant = "ink" | "paper" | "outline";
export type ButtonSize = "sm" | "md" | "lg";

const variants: Record<ButtonVariant, string> = {
  ink: "bg-ink text-paper border border-ink hover:bg-paper hover:text-ink focus-visible:outline-ink",
  paper: "bg-paper text-ink border border-paper hover:bg-transparent hover:text-paper focus-visible:outline-paper",
  outline: "border border-current bg-transparent hover:bg-current/10",
};

const sizes: Record<ButtonSize, string> = {
  sm: "min-h-9 px-3 text-[11px]",
  md: "min-h-11 px-5 text-xs",
  lg: "min-h-13 px-7 text-sm",
};

export function buttonClasses(
  variant: ButtonVariant = "ink",
  size: ButtonSize = "md",
  extra = "",
) {
  return [
    "inline-flex items-center justify-center gap-2 font-mono uppercase tracking-[0.12em]",
    "transition-colors duration-200 disabled:pointer-events-none disabled:opacity-50",
    "select-none whitespace-nowrap",
    variants[variant],
    sizes[size],
    extra,
  ].join(" ");
}

type ButtonLinkProps = LinkProps & {
  children: ReactNode;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  "aria-label"?: string;
};

export function ButtonLink({ variant, size, className, children, ...props }: ButtonLinkProps) {
  return (
    <Link {...props} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
};

export function Button({ variant, size, className, type = "button", ...props }: ButtonProps) {
  return <button type={type} {...props} className={buttonClasses(variant, size, className)} />;
}

/** Underlined text link with a chevron, e.g. "Book Your Appointment >". */
export function ArrowLink({
  className = "",
  children,
  ...props
}: LinkProps & { children: ReactNode; className?: string }) {
  return (
    <Link
      {...props}
      className={`group inline-flex items-center gap-2 text-sm underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-transparent ${className}`}
    >
      {children}
      <ChevronRightIcon size={14} className="transition-transform duration-200 group-hover:translate-x-1" />
    </Link>
  );
}
