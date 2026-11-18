/**
 * Shown while the Studio's JavaScript loads. After that it stays underneath
 * the Studio as a backdrop (hidden from assistive tech), so there is never a
 * blank flash between this screen and Sanity's own loading state.
 * Colours follow the visitor's system light/dark preference, like the Studio.
 */
export function StudioLoading({ backdrop = false }: { backdrop?: boolean }) {
  return (
    <div
      role={backdrop ? undefined : "status"}
      aria-hidden={backdrop || undefined}
      className="fixed inset-0 -z-10 flex flex-col items-center justify-center gap-4 bg-paper px-4 text-center text-ink dark:bg-[#101112] dark:text-paper"
    >
      <span className="font-blackletter text-5xl leading-none" aria-hidden="true">
        Garry
      </span>
      <p className="animate-pulse font-mono text-[11px] uppercase tracking-[0.2em]">Loading studio…</p>
    </div>
  );
}
