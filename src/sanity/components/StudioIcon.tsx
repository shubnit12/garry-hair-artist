/**
 * Workspace icon in the Studio navbar: a monochrome blackletter "G" monogram
 * (the site's display face, loaded by the root layout) that follows the
 * Studio's light/dark theme. Sanity sizes the SVG to its container.
 */
export function StudioIcon() {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" focusable="false">
      <rect width="32" height="32" rx="6" style={{ fill: "currentColor" }} />
      <text
        x="16"
        y="23.5"
        textAnchor="middle"
        style={{
          fill: "var(--card-bg-color, #fff)",
          fontFamily: "var(--font-blackletter), 'Old English Text MT', Georgia, serif",
          fontSize: 21,
        }}
      >
        G
      </text>
    </svg>
  );
}
