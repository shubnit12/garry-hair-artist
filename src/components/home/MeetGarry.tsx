import { ArrowLink } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { DisplayHeading, Prose } from "@/components/ui/Typography";
import type { SiteImage as SiteImageData } from "@/lib/content/types";
import { toParagraphs } from "@/lib/format";

/**
 * The reference's "Meet the Team", reworked for a solo artist: portrait on the
 * left, heading + story on the right (stacked heading → portrait → story on
 * small screens, which is also the reading order).
 */
export function MeetGarry({
  heading,
  text,
  image,
  name,
}: {
  heading: string;
  text: string;
  image: SiteImageData;
  /** Short name used in the "More about …" link. */
  name: string;
}) {
  const paragraphs = toParagraphs(text);

  return (
    <section aria-labelledby="home-about-heading" className="py-16 sm:py-20 lg:py-28">
      <div className="container-site grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)] md:grid-rows-[1fr_auto_auto_1fr] md:gap-x-10 md:gap-y-6 lg:gap-x-20">
        <DisplayHeading
          id="home-about-heading"
          size="lg"
          className="break-words md:col-start-2 md:row-start-2"
        >
          {heading}
        </DisplayHeading>

        <div className="relative aspect-[4/5] w-full max-w-[560px] overflow-hidden bg-ink-soft md:col-start-1 md:row-span-4 md:row-start-1">
          <SiteImage
            image={image}
            fill
            sizes="(min-width: 1440px) 560px, (min-width: 768px) 40vw, calc(100vw - 2rem)"
          />
        </div>

        <div className="max-w-xl md:col-start-2 md:row-start-3">
          {paragraphs.length ? <Prose paragraphs={paragraphs} className="text-paper/85" /> : null}
          <ArrowLink href="/about" className="mt-6 min-h-11">
            More about {name}
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
