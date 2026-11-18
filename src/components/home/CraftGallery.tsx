import { DisplayHeading } from "@/components/ui/Typography";
import type { GalleryItem } from "@/lib/content/types";

import { GalleryCarousel } from "./GalleryCarousel";

/** "The Art of the Craft": centred blackletter title, short intro, portfolio carousel. */
export function CraftGallery({
  heading,
  intro,
  items,
}: {
  heading: string;
  intro?: string;
  items: GalleryItem[];
}) {
  if (!items.length) return null;

  return (
    <section aria-labelledby="home-gallery-heading" className="border-t border-ink-line py-16 sm:py-20 lg:py-28">
      <div className="container-site">
        <DisplayHeading id="home-gallery-heading" size="xl" className="break-words text-center">
          {heading}
        </DisplayHeading>
        {intro ? (
          <p className="mt-10 max-w-[19rem] text-sm leading-relaxed text-paper/85 sm:mt-12 lg:mt-16">{intro}</p>
        ) : null}
        <GalleryCarousel items={items} label={heading} className="mt-8 lg:mt-10" />
      </div>
    </section>
  );
}
