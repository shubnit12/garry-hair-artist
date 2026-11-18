import { WIZARD_STEPS } from "./StepIndicator";

const block = "animate-pulse bg-paper-soft";

/** Static placeholder matching the wizard layout while it streams in. */
export function BookingWizardSkeleton() {
  return (
    <div aria-busy="true" className="grid items-start gap-8 xl:grid-cols-[minmax(0,1fr)_22rem] xl:gap-10">
      <p role="status" className="sr-only">
        Loading the booking form…
      </p>

      <div aria-hidden="true" className="min-w-0 space-y-5">
        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {WIZARD_STEPS.map(({ step, label }) => (
            <div key={step} className="min-h-11">
              <span className={`block h-1 ${step === 1 ? "bg-paper" : "bg-ink-line"}`} />
              <span className="mt-2.5 flex gap-2 text-[11px] uppercase tracking-[0.16em] text-smoke">
                <span>{String(step).padStart(2, "0")}</span>
                <span className="hidden md:inline">{label}</span>
              </span>
            </div>
          ))}
        </div>

        <div className="theme-paper">
          <div className="space-y-4 px-4 pb-6 pt-7 sm:px-8 sm:pb-8 sm:pt-10 lg:px-10">
            <div className={`h-3 w-40 ${block}`} />
            <div className={`h-10 w-64 max-w-full sm:h-12 ${block}`} />
            <div className={`h-3 w-full max-w-md ${block}`} />
          </div>
          <hr className="rule-dashed border-t" />
          <div className="space-y-8 px-3 py-6 sm:px-8 sm:py-8 lg:px-10">
            {[4, 2].map((count, group) => (
              <div key={group}>
                <div className={`mb-3 h-3 w-28 ${block}`} />
                <div className="grid gap-2.5 md:grid-cols-2">
                  {Array.from({ length: count }, (_, index) => (
                    <div key={index} className="h-[5.5rem] border border-paper-line/60 p-4">
                      <div className={`h-3 w-1/2 ${block}`} />
                      <div className={`mt-3 h-3 w-4/5 ${block}`} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div aria-hidden="true" className="hidden h-96 border border-ink-line xl:block" />
    </div>
  );
}
