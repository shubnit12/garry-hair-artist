import { PaperPanel } from "@/components/ui/Panel";
import type { Testimonial } from "@/lib/content/types";

/** Strips quote marks an editor may have typed, since the layout adds its own. */
function cleanQuote(quote: string) {
  return quote.trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, "").trim();
}

function Rating({ value }: { value: number }) {
  const stars = Math.min(5, Math.max(1, Math.round(value)));
  return (
    <p className="mb-5 text-sm tracking-[0.25em]">
      <span aria-hidden="true">
        {"★".repeat(stars)}
        <span className="text-ash">{"☆".repeat(5 - stars)}</span>
      </span>
      <span className="sr-only">Rated {stars} out of 5</span>
    </p>
  );
}

/**
 * "What Clients Say" — real client reviews from the Studio in columns divided
 * by dotted rules. Renders nothing until at least one testimonial exists.
 */
export function Testimonials({
  heading,
  testimonials,
}: {
  heading: string;
  testimonials: Testimonial[];
}) {
  if (!testimonials.length) return null;

  const count = testimonials.length;
  const columns = count === 1 ? "" : count === 2 ? "md:grid-cols-2" : "md:grid-cols-2 lg:grid-cols-3";

  return (
    <section aria-labelledby="home-testimonials-heading" className="container-site py-16 sm:py-20 lg:py-28">
      <PaperPanel title={heading} titleId="home-testimonials-heading">
        {/* Each cell draws a dotted top + left rule; the -1px offset hides the outer ones. */}
        <div className="overflow-hidden">
          <ul className={`-ml-px -mt-px grid grid-cols-1 ${columns}`}>
            {testimonials.map((testimonial) => (
              <li key={testimonial.id} className="border-l border-t border-dotted border-paper-line">
                <figure
                  className={`flex h-full flex-col px-6 py-10 sm:px-10 lg:py-14 ${
                    count === 1 ? "mx-auto max-w-2xl text-center" : ""
                  }`}
                >
                  {testimonial.rating ? <Rating value={testimonial.rating} /> : null}
                  <blockquote className="text-pretty text-sm leading-relaxed sm:text-[15px]">
                    <p>&ldquo;{cleanQuote(testimonial.quote)}&rdquo;</p>
                  </blockquote>
                  <figcaption className="mt-auto pt-8">
                    <span className="block text-[13px] font-bold uppercase tracking-[0.16em]">
                      {testimonial.name}
                    </span>
                    {testimonial.service ? (
                      <span className="mt-1 block text-[13px] text-ash">{testimonial.service}</span>
                    ) : null}
                  </figcaption>
                </figure>
              </li>
            ))}
          </ul>
        </div>
      </PaperPanel>
    </section>
  );
}
