import type { ReactNode } from "react";

import "./studio.css";

/**
 * The Studio is a full-screen app: no announcement bar, header or footer
 * (those belong to the `(site)` route group).
 */
export default function StudioLayout({ children }: { children: ReactNode }) {
  return children;
}
