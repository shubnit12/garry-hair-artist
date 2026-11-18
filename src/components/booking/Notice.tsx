import type { ReactNode, Ref } from "react";

function AlertIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
    >
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5v5.5M12 16.5h.01" />
    </svg>
  );
}

/**
 * Inline banner for booking problems. `role="alert"` (default) is announced
 * immediately by screen readers when it appears.
 */
export function Notice({
  tone = "warning",
  title,
  children,
  role = "alert",
  className = "",
  focusable = false,
  ref,
}: {
  tone?: "warning" | "error";
  title?: string;
  children?: ReactNode;
  role?: "alert" | "status";
  className?: string;
  /** Allow programmatic focus (e.g. after a failed submit). */
  focusable?: boolean;
  ref?: Ref<HTMLDivElement>;
}) {
  const accent = tone === "error" ? "border-l-danger" : "border-l-ink";
  return (
    <div
      ref={ref}
      role={role}
      tabIndex={focusable ? -1 : undefined}
      className={`flex gap-3 border border-l-4 border-paper-line bg-paper-soft p-4 text-sm leading-relaxed text-ink outline-none ${accent} ${className}`}
    >
      <AlertIcon className={`mt-0.5 shrink-0 ${tone === "error" ? "text-danger" : ""}`} />
      <div className="min-w-0 flex-1 space-y-3">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children}
      </div>
    </div>
  );
}
