import type { BookingStatus } from "@/lib/booking/types";

const STATUS: Record<BookingStatus, { label: string; className: string }> = {
  confirmed: { label: "Confirmed", className: "border-ink bg-ink text-paper" },
  pending: { label: "Pending", className: "border-dashed border-ink text-ink" },
  cancelled: { label: "Cancelled", className: "border-paper-line text-ash line-through decoration-1" },
  completed: { label: "Completed", className: "border-ink text-ink" },
  "no-show": { label: "No-show", className: "border-paper-line text-ash" },
};

export function bookingStatusLabel(status: BookingStatus): string {
  return STATUS[status]?.label ?? status;
}

/** Monochrome pill describing a booking's status. */
export function StatusBadge({ status }: { status: BookingStatus }) {
  const config = STATUS[status] ?? { label: status, className: "border-ink text-ink" };
  return (
    <span
      className={`inline-flex min-h-8 items-center border px-3 text-[11px] font-semibold uppercase tracking-[0.16em] ${config.className}`}
    >
      <span className="sr-only">Status: </span>
      {config.label}
    </span>
  );
}
