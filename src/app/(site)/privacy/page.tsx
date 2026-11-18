import type { Metadata } from "next";

import { BookingCta } from "@/components/services/BookingCta";
import { MailIcon } from "@/components/ui/icons";
import { PageHeader } from "@/components/ui/PageHeader";
import { getPrivacyPage, getSiteSettings } from "@/lib/content/get";
import { toParagraphs } from "@/lib/format";
import { buildPageMetadata } from "@/lib/seo/metadata";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPrivacyPage();
  return buildPageMetadata({ path: "/privacy", title: page.heading, seo: page.seo });
}

type Block = { type: "heading"; text: string; id: string } | { type: "paragraph"; text: string };

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/[\s_-]+/g, "-");
}

/** Editor text → blocks. A paragraph starting with "## " is a heading; text after its first line is kept. */
function parseBody(body: string): Block[] {
  const blocks: Block[] = [];
  const used = new Set<string>();
  for (const paragraph of toParagraphs(body)) {
    if (!paragraph.startsWith("## ")) {
      blocks.push({ type: "paragraph", text: paragraph });
      continue;
    }
    const [first, ...rest] = paragraph.split("\n");
    const text = first.slice(3).trim();
    if (text) {
      let id = `section-${slugify(text) || blocks.length}`;
      while (used.has(id)) id = `${id}-${blocks.length}`;
      used.add(id);
      blocks.push({ type: "heading", text, id });
    }
    const after = rest.join("\n").trim();
    if (after) blocks.push({ type: "paragraph", text: after });
  }
  return blocks;
}

/** "2026-10-31" → "October 31, 2026" (calendar date, so no timezone shift). */
function formatUpdatedAt(value: string | undefined): string | undefined {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return undefined;
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12));
  if (Number.isNaN(date.getTime())) return undefined;
  return new Intl.DateTimeFormat("en-CA", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(
    date,
  );
}

export default async function PrivacyPage() {
  const [page, settings] = await Promise.all([getPrivacyPage(), getSiteSettings()]);
  const blocks = parseBody(page.body);
  const updated = formatUpdatedAt(page.updatedAt);

  return (
    <>
      <PageHeader eyebrow="Legal" title={page.heading} intro={page.seo.description}>
        {updated ? (
          <p className="text-[11px] uppercase tracking-[0.2em] text-smoke">
            Last updated <time dateTime={page.updatedAt?.slice(0, 10)}>{updated}</time>
          </p>
        ) : null}
      </PageHeader>

      <div className="container-site py-12 sm:py-16 lg:py-20">
        <article aria-label={page.heading} className="theme-paper px-5 py-10 sm:px-10 sm:py-14 lg:px-16 lg:py-16">
          <div className="mx-auto max-w-prose">
            {blocks.map((block, index) =>
              block.type === "heading" ? (
                <h2
                  key={index}
                  id={block.id}
                  className="mt-12 scroll-mt-24 border-t border-dashed border-paper-line pt-8 font-mono text-sm font-semibold uppercase tracking-[0.16em] first:mt-0 first:border-t-0 first:pt-0 sm:text-base"
                >
                  {block.text}
                </h2>
              ) : (
                <p
                  key={index}
                  className="mt-4 whitespace-pre-line text-[15px] leading-[1.8] text-ink/85 first:mt-0"
                >
                  {block.text}
                </p>
              ),
            )}

            <div className="mt-12 flex flex-col gap-4 border border-ink p-5 sm:flex-row sm:items-center sm:gap-6 sm:p-6">
              <span aria-hidden="true" className="flex size-11 shrink-0 items-center justify-center border border-ink">
                <MailIcon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em]">Privacy contact</p>
                <p className="mt-1 text-sm text-ash">
                  For questions or requests about your personal information, email{" "}
                  <a
                    href={`mailto:${settings.email}?subject=${encodeURIComponent("Privacy request")}`}
                    className="break-all text-ink underline underline-offset-4"
                  >
                    {settings.email}
                  </a>
                  .
                </p>
              </div>
            </div>
          </div>
        </article>
      </div>

      <BookingCta />
    </>
  );
}
