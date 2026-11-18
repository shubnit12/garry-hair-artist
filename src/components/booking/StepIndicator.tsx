import type { WizardStep } from "./types";

export const WIZARD_STEPS: { step: WizardStep; label: string }[] = [
  { step: 1, label: "Service" },
  { step: 2, label: "Date & time" },
  { step: 3, label: "Your details" },
  // Neutral: when bookings need Garry's approval, step 4 is a request, not a confirmation.
  { step: 4, label: "Done" },
];

/**
 * Progress through the booking wizard. Completed steps are buttons (to go
 * back) until the booking is confirmed. Labels collapse to numbers on phones,
 * where the step card's eyebrow names the current step.
 */
export function StepIndicator({
  current,
  onSelect,
}: {
  current: WizardStep;
  onSelect?: (step: WizardStep) => void;
}) {
  return (
    <nav aria-label="Booking progress">
      <ol className="grid grid-cols-4 gap-1.5 sm:gap-2">
        {WIZARD_STEPS.map(({ step, label }) => {
          const state = step < current ? "done" : step === current ? "current" : "upcoming";
          const canSelect = state === "done" && current !== 4 && onSelect;
          const content = (
            <>
              <span
                aria-hidden="true"
                className={`block h-1 w-full transition-colors ${state === "upcoming" ? "bg-ink-line" : "bg-paper"}`}
              />
              <span
                className={`mt-2.5 flex items-baseline gap-2 text-[11px] uppercase tracking-[0.16em] ${
                  state === "current" ? "text-paper" : state === "done" ? "text-paper/80" : "text-smoke"
                }`}
              >
                <span aria-hidden="true" className="tabular-nums">
                  {String(step).padStart(2, "0")}
                </span>
                <span className="sr-only md:not-sr-only md:truncate">{label}</span>
                {state === "done" ? <span className="sr-only">(completed)</span> : null}
              </span>
            </>
          );
          return (
            <li key={step} aria-current={state === "current" ? "step" : undefined} className="min-w-0">
              {canSelect ? (
                <button
                  type="button"
                  onClick={() => onSelect(step)}
                  className="flex min-h-11 w-full flex-col justify-start text-left hover:opacity-80"
                >
                  <span className="sr-only">Back to step {step}: </span>
                  {content}
                </button>
              ) : (
                <div className="min-h-11">
                  <span className="sr-only">Step {step}: </span>
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
