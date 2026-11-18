import { ArrowLink } from "@/components/ui/Button";
import { ArrowUpRightIcon } from "@/components/ui/icons";
import { SiteImage } from "@/components/ui/SiteImage";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";
import type { GalleryItem } from "@/lib/content/types";

/**
 * Three-image portfolio strip. On phones the first image runs full width with
 * two below it, so the strip never needs sideways scrolling.
 */
export function RecentWork({ items, instagramUrl }: { items: GalleryItem[]; instagramUrl?: string }) {
  const work = items.slice(0, 3);
  if (!work.length) return null;
  const featureFirst = work.length === 3;

  return (
    <section aria-labelledby="recent-work-title" className="container-site pb-16 sm:pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink-line pb-6 sm:mb-10">
        <div>
          <Eyebrow className="mb-3 text-smoke">Portfolio</Eyebrow>
          <DisplayHeading id="recent-work-title" size="md">
            Recent Work
          </DisplayHeading>
        </div>
        {instagramUrl ? (
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="group inline-flex min-h-11 items-center gap-2 text-sm underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-transparent"
          >
            More on Instagram
            <ArrowUpRightIcon size={14} className="transition-transform duration-200 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span className="sr-only"> (opens in a new tab)</span>
          </a>
        ) : (
          <ArrowLink href="/services">See the services</ArrowLink>
        )}
      </div>

      <ul className="grid grid-cols-2 gap-x-1.5 gap-y-8 sm:grid-cols-3">
        {work.map((item, index) => {
          const feature = featureFirst && index === 0;
          return (
            <li key={item.id} className={feature ? "col-span-2 sm:col-span-1" : ""}>
              <figure>
                <div
                  className={`relative overflow-hidden bg-ink-soft sm:aspect-[3/4] ${feature ? "aspect-[4/5]" : "aspect-[3/4]"}`}
                >
                  <SiteImage
                    image={item.image}
                    fill
                    sizes={`(min-width: 1440px) 470px, (min-width: 640px) 33vw, ${feature ? "100vw" : "50vw"}`}
                    className="transition-transform duration-700 ease-out hover:scale-[1.03]"
                  />
                </div>
                <figcaption className="mt-3 px-0.5">
                  <span className="block text-xs uppercase tracking-[0.16em]">{item.title}</span>
                  {item.caption ? <span className="mt-1 block text-xs text-smoke">{item.caption}</span> : null}
                </figcaption>
              </figure>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
