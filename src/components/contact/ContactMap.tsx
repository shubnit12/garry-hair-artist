import { ArrowUpRightIcon, MapPinIcon } from "@/components/ui/icons";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";
import { mapsDirectionsUrl, mapsEmbedUrl } from "@/lib/format";

/**
 * Lazy Google Maps embed, desaturated to suit the monochrome design, with an
 * always-visible "Open in Google Maps" link in case the embed is blocked.
 */
export function ContactMap({ query, label }: { query: string; label: string }) {
  const directions = mapsDirectionsUrl(query);

  return (
    <section aria-labelledby="contact-map-title" className="container-site pb-16 sm:pb-24">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-x-6 gap-y-4 border-b border-ink-line pb-6">
        <div>
          <Eyebrow className="mb-3 text-smoke">Location</Eyebrow>
          <DisplayHeading id="contact-map-title" size="md">
            {label}
          </DisplayHeading>
        </div>
        <a
          href={directions}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-2 text-sm underline decoration-1 underline-offset-[6px] transition-[text-decoration-color] hover:decoration-transparent"
        >
          Open in Google Maps
          <ArrowUpRightIcon size={14} />
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>

      <div className="relative aspect-[4/3] overflow-hidden border border-ink-line bg-ink-soft md:aspect-[16/7]">
        {/* Shown until the map paints (or if it is blocked); the real link is in the header above. */}
        <div
          aria-hidden="true"
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 px-6 text-center text-sm text-smoke"
        >
          <MapPinIcon size={24} />
          <p className="max-w-xs">If the map doesn&apos;t appear, use “Open in Google Maps”.</p>
        </div>
        <iframe
          src={mapsEmbedUrl(query)}
          title={`Map showing ${label}`}
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
          className="absolute inset-0 size-full border-0 contrast-125 grayscale"
        />
      </div>
    </section>
  );
}
