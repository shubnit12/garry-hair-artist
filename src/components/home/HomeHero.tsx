import { ArrowLink } from "@/components/ui/Button";
import { SiteImage } from "@/components/ui/SiteImage";
import { MonoTitle } from "@/components/ui/Typography";
import type { HomePage } from "@/lib/content/types";
import { BOOK_HREF } from "@/lib/site";

/**
 * Average advance width of a UnifrakturMaguntia glyph in em ("Garry" measures
 * 2.42em). Slightly generous so any editor-supplied word fits its container.
 */
const SCRIPT_EM_PER_CHAR = 0.5;

/**
 * Hero adapted from the reference: a narrow text column on the left with a
 * giant vertical blackletter word at its foot, and two tall portraits
 * (narrow + wide) running to the right gutter. Below `lg` everything stacks
 * and the word becomes a horizontal line sized to the available width.
 */
export function HomeHero({ home }: { home: HomePage }) {
  const [narrowImage, wideImage] = home.heroImages;
  const scriptEm = (Math.max(home.heroScript.length, 3) * SCRIPT_EM_PER_CHAR).toFixed(2);

  return (
    <section
      aria-labelledby="home-hero-heading"
      className="container-site overflow-x-clip pb-16 pt-8 [--hero-h:clamp(32.5rem,82svh,56.25rem)] sm:pt-10 lg:pb-24 lg:pt-8"
    >
      <div className="grid gap-8 lg:grid-cols-[minmax(0,26fr)_minmax(0,74fr)] lg:gap-6 xl:gap-10">
        <div className="flex min-w-0 flex-col">
          <div className="animate-fade-up">
            <MonoTitle as="h1" className="text-balance lg:text-xl">
              <span id="home-hero-heading">{home.heroHeading}</span>
            </MonoTitle>
            <p className="mt-5 max-w-md text-sm leading-relaxed text-paper/85 sm:text-[15px]">
              {home.heroText}
            </p>
            <ArrowLink href={BOOK_HREF} className="mt-5 min-h-11">
              {home.heroCtaLabel}
            </ArrowLink>
          </div>

          {/* Desktop: vertical word filling the rest of the column (container query units). */}
          <div
            aria-hidden="true"
            className="relative mt-8 hidden min-h-32 flex-1 [container-type:size] lg:block"
          >
            <span
              className="vertical-text absolute bottom-0 left-0 rotate-180 select-none whitespace-nowrap font-blackletter text-[clamp(6rem,11vw,12rem)] leading-none"
              style={{ fontSize: `min(calc(100cqh / ${scriptEm}), 95cqw, 18rem)` }}
            >
              {home.heroScript}
            </span>
          </div>
        </div>

        <div className="min-w-0">
          <div className="grid aspect-[5/4] max-h-[75svh] w-full grid-cols-[minmax(0,2fr)_minmax(0,3fr)] grid-rows-1 gap-1.5 lg:aspect-auto lg:h-[var(--hero-h)] lg:max-h-none">
            {narrowImage ? (
              <div className="relative overflow-hidden bg-ink-soft">
                <SiteImage
                  image={narrowImage}
                  fill
                  preload
                  sizes="(min-width: 1440px) 400px, (min-width: 1024px) 28vw, 40vw"
                />
              </div>
            ) : null}
            {wideImage ? (
              <div className="relative overflow-hidden bg-ink-soft">
                <SiteImage
                  image={wideImage}
                  fill
                  preload
                  sizes="(min-width: 1440px) 600px, (min-width: 1024px) 42vw, 60vw"
                />
              </div>
            ) : null}
          </div>

          {/* Mobile / tablet: the same word as one horizontal line, never wider than the column. */}
          <div aria-hidden="true" className="mt-5 overflow-x-clip [container-type:inline-size] lg:hidden">
            <p
              className="select-none whitespace-nowrap font-blackletter text-[clamp(4rem,22vw,10rem)] leading-[0.95]"
              style={{ fontSize: `min(calc(100cqw / ${scriptEm}), 11rem)` }}
            >
              {home.heroScript}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
