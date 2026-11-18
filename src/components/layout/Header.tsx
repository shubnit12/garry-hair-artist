import { Suspense } from "react";

import { ButtonLink } from "@/components/ui/Button";
import { MenuIcon } from "@/components/ui/icons";
import type { SiteSettings } from "@/lib/content/types";
import { BOOK_HREF } from "@/lib/site";

import { Logo } from "./Logo";
import { MobileMenu } from "./MobileMenu";
import { NavLinks, NavLinksFallback } from "./NavLinks";

/** Inert stand-in for the menu toggle while MobileMenu streams in on dynamic routes. */
function MenuButtonFallback() {
  return (
    <span aria-hidden="true" className="inline-flex size-11 items-center justify-center opacity-60 lg:hidden">
      <MenuIcon size={24} />
    </span>
  );
}

/**
 * Sticky site header: monogram, primary navigation and the booking CTA.
 * Its backdrop-filter makes it the containing block for `position: fixed`
 * descendants, so overlays (the mobile menu) must be portalled out of it.
 */
export function Header({ settings }: { settings: SiteSettings }) {
  const location = [settings.address.city, settings.address.region].filter(Boolean).join(", ");

  return (
    <header className="sticky top-0 z-40 border-b border-ink-line bg-ink/95 backdrop-blur supports-[backdrop-filter]:bg-ink/85">
      <div className="container-site flex h-[var(--header-height)] items-center justify-between gap-6">
        <div className="flex items-center gap-10 xl:gap-24">
          <Logo name={settings.businessName} />
          <nav aria-label="Primary" className="hidden lg:block">
            {/* The active-link state reads the URL; on dynamic routes it streams in. */}
            <Suspense fallback={<NavLinksFallback />}>
              <NavLinks />
            </Suspense>
          </nav>
        </div>

        <div className="flex items-center gap-2 sm:gap-4">
          <span className="hidden text-[12px] uppercase tracking-[0.12em] text-smoke xl:inline">
            {location}
          </span>
          {/* Visibility lives on wrappers: buttonClasses() already sets a display value. */}
          <span className="sm:hidden">
            <ButtonLink href={BOOK_HREF} variant="paper" size="sm">
              Book
            </ButtonLink>
          </span>
          <span className="hidden sm:block">
            <ButtonLink href={BOOK_HREF} variant="paper" size="md">
              Book now
            </ButtonLink>
          </span>
          <Suspense fallback={<MenuButtonFallback />}>
            <MobileMenu footerNote={`${settings.businessName} · ${location}`} />
          </Suspense>
        </div>
      </div>
    </header>
  );
}
