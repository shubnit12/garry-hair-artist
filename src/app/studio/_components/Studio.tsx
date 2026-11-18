"use client";

import dynamic from "next/dynamic";
import { useEffect, useState, useSyncExternalStore } from "react";
import type { StudioThemeColorSchemeKey } from "sanity";

import { StudioLoading } from "./StudioLoading";

/**
 * Browser-only and code-split: Sanity's stylesheets (including a document-wide
 * reset that overrides Tailwind) load with this chunk, i.e. only once the
 * Studio actually mounts.
 */
const StudioApp = dynamic(() => import("./StudioApp"), { ssr: false });

const subscribeNever = () => () => {};

/**
 * The embedded Sanity Studio. It is a browser-only app, so the server (and the
 * static prerender) only emits the loading screen; the Studio mounts after
 * hydration. This keeps the route fully static under Cache Components.
 */
export function Studio() {
  const isBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false,
  );
  const [scheme, setScheme] = useState<StudioThemeColorSchemeKey>("system");

  // The website forces a dark colour scheme; let native controls (select
  // pop-ups, date pickers, scrollbars) follow the Studio's appearance instead.
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.style.colorScheme;
    root.style.colorScheme = scheme === "system" ? "light dark" : scheme;
    return () => {
      root.style.colorScheme = previous;
    };
  }, [scheme]);

  return (
    <>
      <StudioLoading backdrop={isBrowser} />
      {isBrowser ? <StudioApp onSchemeChange={setScheme} /> : null}
    </>
  );
}
