import { PaperPanel } from "@/components/ui/Panel";
import { MonoTitle, Prose } from "@/components/ui/Typography";
import type { ValueItem } from "@/lib/content/types";
import { toParagraphs } from "@/lib/format";

const columns: Record<number, string> = { 1: "", 2: "md:grid-cols-2" };

/** White panel: philosophy statement, then the values in dotted-rule columns. */
export function Philosophy({
  heading,
  text,
  values,
}: {
  heading: string;
  text: string;
  values: ValueItem[];
}) {
  const paragraphs = toParagraphs(text);

  return (
    <section aria-labelledby="philosophy-title" className="container-site pb-14 sm:pb-20 lg:pb-24">
      <PaperPanel title={heading} titleId="philosophy-title">
        {paragraphs.length ? (
          <div className="px-5 py-10 sm:px-10 sm:py-14">
            <Prose paragraphs={paragraphs} className="mx-auto max-w-2xl text-center" />
          </div>
        ) : null}

        {values.length ? (
          <>
            <hr className="rule-dashed border-t" />
            <ul className={`grid ${columns[values.length] ?? "md:grid-cols-3"}`}>
              {values.map((value, index) => (
                <li
                  key={`${index}-${value.title}`}
                  className="border-dotted border-paper-line px-6 py-10 text-center sm:px-10 sm:py-12 [&:not(:first-child)]:border-t md:[&:not(:first-child)]:border-t-0 md:[&:not(:nth-child(3n+1))]:border-l md:[&:nth-child(n+4)]:border-t"
                >
                  <MonoTitle className="font-semibold">{value.title}</MonoTitle>
                  <p className="mx-auto mt-4 max-w-xs text-sm leading-relaxed text-ash">{value.text}</p>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </PaperPanel>
    </section>
  );
}
