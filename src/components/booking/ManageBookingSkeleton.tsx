const block = "animate-pulse bg-paper-soft";

/** Placeholder matching the manage-booking card while details load. */
export function ManageBookingSkeleton() {
  return (
    <div aria-busy="true" className="theme-paper max-w-3xl">
      <p role="status" className="sr-only">
        Loading your booking…
      </p>
      <div aria-hidden="true">
        <div className="flex items-start justify-between gap-4 px-4 pb-6 pt-7 sm:px-8 sm:pt-10 lg:px-10">
          <div className="space-y-3">
            <div className={`h-3 w-32 ${block}`} />
            <div className={`h-7 w-44 ${block}`} />
          </div>
          <div className={`h-8 w-28 ${block}`} />
        </div>
        <hr className="rule-dashed border-t" />
        <div className="px-4 py-7 sm:px-8 sm:py-8 lg:px-10">
          <div className={`h-10 w-56 max-w-full ${block}`} />
          <div className="mt-6 grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, index) => (
              <div key={index} className="space-y-2">
                <div className={`h-3 w-20 ${block}`} />
                <div className={`h-4 w-40 ${block}`} />
              </div>
            ))}
          </div>
        </div>
        <div className="rule-dashed flex flex-col gap-3 border-t px-4 py-6 sm:flex-row sm:px-8 lg:px-10">
          <div className={`h-11 w-full sm:w-44 ${block}`} />
          <div className={`h-11 w-full sm:w-40 ${block}`} />
        </div>
      </div>
    </div>
  );
}
