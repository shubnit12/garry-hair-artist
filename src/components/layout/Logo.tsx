import Link from "next/link";

/** "GH" blackletter monogram, echoing the reference's "AS" mark. */
export function Logo({ name, className = "" }: { name: string; className?: string }) {
  return (
    <Link
      href="/"
      aria-label={`${name} — home`}
      className={`inline-flex items-baseline font-blackletter text-[2.5rem] leading-none tracking-tight ${className}`}
    >
      <span aria-hidden="true">G</span>
      <span aria-hidden="true" className="-ml-[0.08em]">H</span>
    </Link>
  );
}
