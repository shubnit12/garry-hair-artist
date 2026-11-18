/**
 * Shared, email-client-safe HTML scaffolding (tables + inline styles) in the
 * site's monochrome style. Templates in this folder compose these helpers.
 */

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const FONT = "'SFMono-Regular', Menlo, Consolas, 'Liberation Mono', monospace";

export type DetailRow = { label: string; value: string };

/** Two-column key/value table, e.g. Service / Date / Time. Values are escaped. */
export function detailsTable(rows: DetailRow[]): string {
  const body = rows
    .map(
      (row) => `
      <tr>
        <td style="padding:10px 0;border-bottom:1px dashed #c8c8c8;font:12px/1.5 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#595959;width:38%;vertical-align:top;">${escapeHtml(row.label)}</td>
        <td style="padding:10px 0;border-bottom:1px dashed #c8c8c8;font:14px/1.5 ${FONT};color:#111111;vertical-align:top;">${escapeHtml(row.value).replaceAll("\n", "<br>")}</td>
      </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:8px 0 24px;">${body}</table>`;
}

/** Black, full-width call-to-action button. */
export function button(label: string, href: string): string {
  return `
  <table role="presentation" cellpadding="0" cellspacing="0" style="margin:8px 0 24px;">
    <tr><td style="background:#111111;">
      <a href="${escapeHtml(href)}" style="display:inline-block;padding:14px 22px;font:13px/1 ${FONT};letter-spacing:.08em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(label)}</a>
    </td></tr>
  </table>`;
}

export function paragraph(text: string): string {
  return `<p style="margin:0 0 16px;font:14px/1.7 ${FONT};color:#111111;">${escapeHtml(text)}</p>`;
}

export function mutedParagraph(text: string): string {
  return `<p style="margin:0 0 12px;font:12px/1.7 ${FONT};color:#595959;">${escapeHtml(text)}</p>`;
}

/**
 * Wraps body HTML in the branded shell. `preheader` is the inbox preview text.
 * `heading` and `preheader` are escaped; `bodyHtml` must already be safe.
 */
export function emailLayout(options: {
  preheader: string;
  heading: string;
  bodyHtml: string;
  footerLines?: string[];
}): string {
  const footer = (options.footerLines ?? [])
    .map((line) => `<div>${escapeHtml(line)}</div>`)
    .join("");
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${escapeHtml(options.heading)}</title>
</head>
<body style="margin:0;padding:0;background:#111111;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${escapeHtml(options.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">
      <tr><td style="padding:0 0 20px;font:28px/1 'UnifrakturMaguntia','Old English Text MT',Georgia,serif;color:#ffffff;">Garry Hair Artist</td></tr>
      <tr><td style="background:#ffffff;padding:32px 28px;">
        <h1 style="margin:0 0 20px;font:600 18px/1.4 ${FONT};letter-spacing:.06em;text-transform:uppercase;color:#111111;">${escapeHtml(options.heading)}</h1>
        ${options.bodyHtml}
      </td></tr>
      <tr><td style="padding:20px 4px 0;font:11px/1.7 ${FONT};color:#a3a3a3;">${footer}</td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}
