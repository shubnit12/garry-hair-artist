"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_LINKS } from "@/lib/site";

export function isActivePath(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

/** Desktop navigation with active-page indication. */
export function NavLinks() {
  return <NavList pathname={usePathname()} />;
}

/** Same links without the active state — Suspense fallback on dynamic routes. */
export function NavLinksFallback() {
  return <NavList pathname="" />;
}

function NavList({ pathname }: { pathname: string }) {
  return (
    <ul className="flex items-center gap-7">
      {NAV_LINKS.map((link) => {
        const active = isActivePath(pathname, link.href);
        return (
          <li key={link.href}>
            <Link
              href={link.href}
              aria-current={active ? "page" : undefined}
              className={`relative py-2 text-[13px] uppercase tracking-[0.12em] transition-opacity hover:opacity-100 ${
                active ? "opacity-100 after:absolute after:inset-x-0 after:-bottom-0.5 after:h-px after:bg-current" : "opacity-80"
              }`}
            >
              {link.label}
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
