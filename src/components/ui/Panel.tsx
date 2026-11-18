import type { ReactNode } from "react";

import { DisplayHeading } from "./Typography";

/**
 * White "paper" panel inset on the dark canvas, as in the reference design's
 * "Our Signature Services" and "What Our Clients Say" blocks: a centred
 * blackletter title, a dashed rule, then content.
 */
export function PaperPanel({
  title,
  titleId,
  intro,
  children,
  className = "",
  bodyClassName = "",
}: {
  title?: ReactNode;
  titleId?: string;
  intro?: ReactNode;
  children: ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <div className={`theme-paper ${className}`}>
      {title ? (
        <div className="px-4 pb-8 pt-10 text-center sm:px-8 sm:pb-12 sm:pt-14">
          <DisplayHeading id={titleId} size="lg">
            {title}
          </DisplayHeading>
          {intro ? <div className="mx-auto mt-4 max-w-xl text-sm text-ash">{intro}</div> : null}
        </div>
      ) : null}
      {title ? <hr className="rule-dashed border-t" /> : null}
      <div className={bodyClassName}>{children}</div>
    </div>
  );
}
