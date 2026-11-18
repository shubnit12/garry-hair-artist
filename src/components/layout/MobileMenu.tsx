"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { buttonClasses } from "@/components/ui/Button";
import { CloseIcon, MenuIcon } from "@/components/ui/icons";
import { BOOK_HREF, NAV_LINKS } from "@/lib/site";

import { isActivePath } from "./NavLinks";

/** Tailwind's `lg` breakpoint, where the desktop navigation replaces this menu. */
const DESKTOP_QUERY = "(min-width: 64rem)";

/**
 * Full-screen mobile navigation. Accessible dialog behaviour: focus moves into
 * the panel, Tab is trapped, Escape closes and focus returns to the toggle.
 *
 * The panel is portalled to <body> and mounted only while open: the sticky
 * header's backdrop-filter makes it the containing block for `position: fixed`
 * descendants, which would clip a panel rendered inside it to the header strip.
 */
export function MobileMenu({ footerNote }: { footerNote: string }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const panelId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  // Close whenever the route changes (state adjusted during render, not in an effect).
  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  // Next keeps visited routes mounted but hidden (<Activity>); never return to an open menu.
  useLayoutEffect(() => () => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const panel = panelRef.current;
    const toggle = toggleRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    panel?.querySelector<HTMLElement>("nav a")?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle?.focus();
        return;
      }
      if (event.key !== "Tab" || !panel) return;
      const focusable = Array.from(panel.querySelectorAll<HTMLElement>("a[href], button:not([disabled])"));
      const first = focusable[0];
      const last = focusable.at(-1);
      if (!first || !last) return;
      const active = document.activeElement;
      const outside = !panel.contains(active);
      if (event.shiftKey && (outside || active === first)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (outside || active === last)) {
        event.preventDefault();
        first.focus();
      }
    };

    // The panel is hidden from lg up; close it so the scroll lock and trap don't outlive it.
    const desktop = window.matchMedia(DESKTOP_QUERY);
    const onBreakpoint = () => {
      if (desktop.matches) setOpen(false);
    };

    document.addEventListener("keydown", onKeyDown);
    desktop.addEventListener("change", onBreakpoint);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      desktop.removeEventListener("change", onBreakpoint);
      // Unmounting the panel drops focus to <body> (link click, back/forward); return it to the toggle.
      const active = document.activeElement;
      if (!active || active === document.body || panel?.contains(active)) toggle?.focus();
    };
  }, [open]);

  return (
    <>
      <button
        ref={toggleRef}
        type="button"
        className="inline-flex size-11 items-center justify-center lg:hidden"
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        aria-label="Open menu"
        onClick={() => setOpen(true)}
      >
        <MenuIcon size={24} />
      </button>

      {open
        ? createPortal(
            <div
              id={panelId}
              ref={panelRef}
              role="dialog"
              aria-modal="true"
              aria-label="Site menu"
              className="fixed inset-0 z-50 flex flex-col overflow-y-auto overscroll-contain bg-ink text-paper lg:hidden"
            >
              <div className="container-site flex h-[var(--header-height)] shrink-0 items-center justify-between border-b border-ink-line">
                <span className="font-blackletter text-[2.5rem] leading-none" aria-hidden="true">GH</span>
                <button
                  type="button"
                  className="inline-flex size-11 items-center justify-center"
                  aria-label="Close menu"
                  onClick={() => {
                    setOpen(false);
                    toggleRef.current?.focus();
                  }}
                >
                  <CloseIcon size={24} />
                </button>
              </div>
              <nav aria-label="Mobile" className="container-site flex flex-1 flex-col justify-between gap-10 py-10">
                <ul className="space-y-2">
                  {NAV_LINKS.map((link, index) => {
                    const active = isActivePath(pathname, link.href);
                    return (
                      <li key={link.href} className="animate-fade-up" style={{ animationDelay: `${index * 50}ms` }}>
                        <Link
                          href={link.href}
                          aria-current={active ? "page" : undefined}
                          onClick={() => setOpen(false)}
                          className={`block font-blackletter text-[clamp(2.75rem,14vw,4.5rem)] leading-[1.1] ${active ? "" : "opacity-70 hover:opacity-100"}`}
                        >
                          {link.label}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
                <div className="space-y-6">
                  <Link
                    href={BOOK_HREF}
                    onClick={() => setOpen(false)}
                    className={buttonClasses("paper", "lg", "w-full")}
                  >
                    Book an appointment
                  </Link>
                  <p className="text-xs text-smoke">{footerNote}</p>
                </div>
              </nav>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
