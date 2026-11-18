"use client";

import type { CSSProperties } from "react";

/**
 * Last-resort error page, used when the root layout itself fails. It replaces
 * the whole document, so it renders its own <html>/<body> and uses inline
 * styles only (the app stylesheet and fonts may not have loaded).
 */

const INK = "#111111";
const PAPER = "#ffffff";
const SMOKE = "#a3a3a3";
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace';

const action: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 48,
  padding: "0 28px",
  border: `1px solid ${PAPER}`,
  fontFamily: MONO,
  fontSize: 13,
  letterSpacing: "0.12em",
  textTransform: "uppercase",
  textDecoration: "none",
  cursor: "pointer",
};

export default function GlobalError({ retry }: { error: unknown; retry: () => void }) {
  return (
    <html lang="en-CA">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          background: INK,
          color: PAPER,
          fontFamily: MONO,
          colorScheme: "dark",
        }}
      >
        <title>Something went wrong | Garry Hair Artist</title>
        <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", padding: "64px 24px", boxSizing: "border-box" }}>
          <p style={{ margin: 0, fontSize: 11, letterSpacing: "0.2em", textTransform: "uppercase", color: SMOKE }}>
            Garry Hair Artist
          </p>
          <h1
            style={{
              margin: "20px 0 0",
              fontFamily: '"UnifrakturMaguntia", "Old English Text MT", "Times New Roman", serif',
              fontWeight: 400,
              fontSize: "clamp(2.75rem, 10vw, 5.5rem)",
              lineHeight: 1,
            }}
          >
            A Small Snag
          </h1>
          <p style={{ margin: "24px 0 0", maxWidth: 520, fontSize: 15, lineHeight: 1.7, color: "rgba(255,255,255,0.85)" }}>
            The website hit an unexpected problem. Please try again in a moment — your existing
            bookings are not affected.
          </p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginTop: 40 }}>
            <button type="button" onClick={() => retry()} style={{ ...action, background: PAPER, color: INK }}>
              Try again
            </button>
            {/* A full page load (not client navigation) gives the app a clean start. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href="/" style={{ ...action, background: "transparent", color: PAPER }}>
              Go to home page
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
