"use client";

import { NextStudio } from "next-sanity/studio";
import type { StudioThemeColorSchemeKey } from "sanity";

import config from "../../../../sanity.config";

/**
 * The Sanity Studio itself. Loaded only through `next/dynamic` in Studio.tsx:
 * importing `sanity` pulls in Sanity UI's global CSS reset, which must never
 * reach the setup screen or the website.
 */
export default function StudioApp({
  onSchemeChange,
}: {
  onSchemeChange: (scheme: StudioThemeColorSchemeKey) => void;
}) {
  return <NextStudio config={config} onSchemeChange={onSchemeChange} />;
}
