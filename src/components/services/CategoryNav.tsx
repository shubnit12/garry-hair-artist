import { Eyebrow } from "@/components/ui/Typography";

import type { ServiceGroup } from "./categories";

/**
 * Category quick links. On phones the chips scroll sideways inside their own
 * strip (bleeding to the screen edges) so the page itself never overflows.
 */
export function CategoryNav({ groups }: { groups: ServiceGroup[] }) {
  if (groups.length < 2) return null;

  return (
    <nav aria-labelledby="service-categories-label">
      <Eyebrow className="mb-4 text-smoke">
        <span id="service-categories-label">Browse by category</span>
      </Eyebrow>
      <ul className="scrollbar-none -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:overflow-visible sm:px-0">
        {groups.map((group) => (
          <li key={group.value} className="shrink-0">
            {/* `relative` keeps the sr-only spans inside the scroller (absolute children would widen the page). */}
            <a
              href={`#${group.anchor}`}
              className="relative inline-flex min-h-11 items-center gap-3 whitespace-nowrap border border-ink-line px-4 text-xs uppercase tracking-[0.14em] text-paper/85 transition-colors hover:border-paper hover:text-paper"
            >
              {group.label}
              <span className="tabular-nums text-smoke">
                <span className="sr-only">, </span>
                {group.services.length}
                <span className="sr-only"> {group.services.length === 1 ? "service" : "services"}</span>
              </span>
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
