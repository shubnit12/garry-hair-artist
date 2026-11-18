"use client";

import { useId, useRef, useState, type ReactNode, type Ref } from "react";

import { Button } from "@/components/ui/Button";
import { ChevronRightIcon } from "@/components/ui/icons";
import { SERVICE_CATEGORIES } from "@/lib/content/types";
import { formatDuration, formatServicePrice } from "@/lib/format";

import { Notice } from "./Notice";
import { StepFrame } from "./StepFrame";
import type { WizardService } from "./types";

type ServiceGroup = { key: string; label: string; services: WizardService[] };

/** Groups in SERVICE_CATEGORIES order; anything uncategorised goes last. */
function groupByCategory(services: WizardService[]): ServiceGroup[] {
  const known = new Set<string>(SERVICE_CATEGORIES.map((category) => category.value));
  const groups: ServiceGroup[] = SERVICE_CATEGORIES.map((category) => ({
    key: category.value,
    label: category.label,
    services: services.filter((service) => service.category === category.value),
  }));
  groups.push({
    key: "other",
    label: "More services",
    services: services.filter((service) => !known.has(service.category)),
  });
  return groups.filter((group) => group.services.length > 0);
}

function ServiceCard({
  service,
  checked,
  onSelect,
}: {
  service: WizardService;
  checked: boolean;
  onSelect: (slug: string) => void;
}) {
  const id = useId();
  return (
    <label
      htmlFor={`${id}-input`}
      className="group flex min-h-11 cursor-pointer items-start gap-3.5 border border-paper-line p-4 transition-colors hover:border-ink has-checked:border-ink has-checked:bg-ink has-checked:text-paper has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ink sm:gap-4"
    >
      <input
        id={`${id}-input`}
        type="radio"
        name="service"
        value={service.slug}
        checked={checked}
        onChange={() => onSelect(service.slug)}
        aria-labelledby={`${id}-name`}
        aria-describedby={`${id}-meta ${id}-summary`}
        className="mt-0.5 grid size-5 shrink-0 cursor-pointer appearance-none place-content-center rounded-full border-2 border-current before:size-2 before:rounded-full before:bg-current before:opacity-0 checked:before:opacity-100 focus-visible:outline-none"
      />
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
          <span id={`${id}-name`} className="text-sm font-semibold uppercase tracking-[0.12em]">
            {service.name}
          </span>
          <span id={`${id}-meta`} className="text-[13px] tabular-nums">
            <span className="font-semibold">{formatServicePrice(service)}</span>
            <span className="text-ash transition-colors group-has-checked:text-paper/75"> · {formatDuration(service.durationMinutes)}</span>
          </span>
        </span>
        {service.summary ? (
          <span
            id={`${id}-summary`}
            className="mt-1.5 block text-[13px] leading-relaxed text-ash transition-colors group-has-checked:text-paper/75"
          >
            {service.summary}
          </span>
        ) : null}
      </span>
    </label>
  );
}

/** Step 1 — choose a service (radio cards grouped by category). */
export function ServiceStep({
  services,
  selectedSlug,
  notice,
  onSelect,
  onContinue,
  headingRef,
}: {
  services: WizardService[];
  selectedSlug: string | null;
  notice?: ReactNode;
  onSelect: (slug: string) => void;
  onContinue: () => void;
  headingRef: Ref<HTMLHeadingElement>;
}) {
  const groups = groupByCategory(services);
  const hasConsultation = services.some((service) => service.category === "consultation");
  const baseId = useId();
  const fieldsetRef = useRef<HTMLFieldSetElement>(null);
  const [showError, setShowError] = useState(false);

  function handleContinue() {
    if (!selectedSlug) {
      setShowError(true);
      fieldsetRef.current?.querySelector<HTMLInputElement>('input[type="radio"]')?.focus();
      return;
    }
    onContinue();
  }

  return (
    <StepFrame
      eyebrow="Step 1 of 4 · Service"
      title="Choose a service"
      description={
        hasConsultation
          ? "Prices are in Canadian dollars. Not sure what you need? Book a consultation and plan it together."
          : "Prices are in Canadian dollars."
      }
      headingRef={headingRef}
      actions={
        <Button variant="ink" size="lg" onClick={handleContinue} className="w-full sm:w-auto">
          Continue
          <ChevronRightIcon size={16} />
        </Button>
      }
    >
      {notice}
      <fieldset ref={fieldsetRef} aria-describedby={showError && !selectedSlug ? `${baseId}-error` : undefined}>
        <legend className="sr-only">Service</legend>
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.key} role="group" aria-labelledby={`${baseId}-${group.key}`}>
              <h3
                id={`${baseId}-${group.key}`}
                className="mb-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-ash"
              >
                {group.label}
              </h3>
              <div className="grid gap-2.5 md:grid-cols-2">
                {group.services.map((service) => (
                  <ServiceCard
                    key={service.slug}
                    service={service}
                    checked={service.slug === selectedSlug}
                    onSelect={(slug) => {
                      setShowError(false);
                      onSelect(slug);
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </fieldset>
      {showError && !selectedSlug ? (
        <Notice tone="error" className="mt-6">
          <p id={`${baseId}-error`}>Please choose a service to continue.</p>
        </Notice>
      ) : null}
    </StepFrame>
  );
}
