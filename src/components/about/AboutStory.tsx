import { ArrowLink } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { Prose } from "@/components/ui/Typography";
import type { SiteImage as SiteImageData } from "@/lib/content/types";
import { toParagraphs } from "@/lib/format";

/** Large portrait beside the story (stacked on smaller screens). */
export function AboutStory({
  portrait,
  story,
  signature,
  caption,
}: {
  portrait: SiteImageData;
  story: string;
  /** Short name shown as a blackletter sign-off, e.g. "Garry". */
  signature: string;
  /** Small caption under the portrait, e.g. "Hair artist · Surrey, BC". */
  caption: string;
}) {
  const paragraphs = toParagraphs(story);

  return (
    <section aria-labelledby="about-story-title" className="container-site py-14 sm:py-20 lg:py-24">
      <div className="grid gap-12 lg:grid-cols-12 lg:items-center lg:gap-16">
        <figure className="w-full sm:max-w-lg lg:col-span-5 lg:max-w-none">
          <div className="relative aspect-[4/5] overflow-hidden bg-ink-soft">
            <SiteImage
              image={portrait}
              fill
              preload
              sizes="(min-width: 1440px) 580px, (min-width: 1024px) 40vw, (min-width: 640px) 512px, 100vw"
              quality={85}
            />
          </div>
          <figcaption className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[11px] uppercase tracking-[0.2em] text-smoke">
            <span>{signature}</span>
            <span>{caption}</span>
          </figcaption>
        </figure>

        <div className="lg:col-span-6 lg:col-start-7">
          <h2 id="about-story-title" className="font-mono text-base uppercase tracking-[0.14em] sm:text-lg">
            The story
          </h2>
          <hr className="my-6 w-16 border-t border-paper/40" />
          {paragraphs.length ? <Prose paragraphs={paragraphs} className="max-w-xl text-paper/85" /> : null}
          <p aria-hidden="true" className="mt-10 font-blackletter text-5xl leading-none sm:text-6xl">
            {signature}
          </p>
          <ArrowLink href="/services" className="mt-10">
            Explore the services
          </ArrowLink>
        </div>
      </div>
    </section>
  );
}
