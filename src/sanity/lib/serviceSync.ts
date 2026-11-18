import type { FormPatch } from "sanity";

/**
 * Keeps a booking's service snapshot (name, slug and duration) in step with
 * the service Garry picks in the Studio. The booking engine, emails and the
 * manage page read these stored fields first, and a booking without its own
 * duration would shrink to 60 minutes if its (weakly referenced) service were
 * ever deleted or unpublished.
 */

export type ServiceSnapshot = {
  _id: string;
  name?: string | null;
  slug?: string | null;
  durationMinutes?: number | null;
};

/** Mutation patches for the booking document (Sanity `patch.execute` format). */
export type BookingPatch = { set: Record<string, string | number> } | { unset: string[] };

/** Services by published or draft id, for `pickService`. */
export const SERVICES_BY_ID_QUERY = /* groq */ `*[_type == "service" && _id in $ids]{
  _id,
  name,
  "slug": slug.current,
  durationMinutes
}`;

/** Ids to fetch (published + draft) so that unpublished services resolve too. */
export function serviceIds(...ids: (string | undefined)[]): string[] {
  return ids.flatMap((id) => (id ? [id, `drafts.${id}`] : []));
}

/** The published version of service `id`, else its draft. */
export function pickService(docs: readonly ServiceSnapshot[], id: string | undefined): ServiceSnapshot | null {
  if (!id) return null;
  return docs.find((doc) => doc._id === id) ?? docs.find((doc) => doc._id === `drafts.${id}`) ?? null;
}

/**
 * The document id a reference input's patches point the reference at, or
 * undefined when they don't select a document (e.g. clearing the field).
 */
export function selectedReferenceId(patches: readonly FormPatch[]): string | undefined {
  let selected: string | undefined;
  for (const patch of patches) {
    if (patch.type !== "set") continue;
    const [first, ...rest] = patch.path;
    if (first === "_ref" && rest.length === 0 && typeof patch.value === "string") {
      selected = patch.value;
    } else if (patch.path.length === 0 && isReferenceValue(patch.value)) {
      selected = patch.value._ref;
    }
  }
  return selected || undefined;
}

function isReferenceValue(value: unknown): value is { _ref: string } {
  return typeof value === "object" && value !== null && typeof (value as { _ref?: unknown })._ref === "string";
}

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 5 && value <= 720;
}

/**
 * What to write on the booking after Garry switches its service from
 * `previous` (null when there was none, or it no longer exists) to `next`:
 * - the name and slug always follow the chosen service;
 * - the duration is filled in when empty, and updated when it still equals the
 *   previous service's length. A custom length is kept (the Studio then warns
 *   if it differs from the new service's).
 */
export function serviceChangePatches(
  currentDuration: unknown,
  previous: ServiceSnapshot | null,
  next: ServiceSnapshot,
): BookingPatch[] {
  const set: Record<string, string | number> = {};
  const unset: string[] = [];

  const name = next.name?.trim();
  if (name) set.serviceName = name;
  else unset.push("serviceName");

  const slug = next.slug?.trim();
  if (slug) set.serviceSlug = slug;
  else unset.push("serviceSlug");

  const followsPrevious =
    typeof currentDuration !== "number" || currentDuration === previous?.durationMinutes;
  if (isDuration(next.durationMinutes) && followsPrevious) set.durationMinutes = next.durationMinutes;

  const patches: BookingPatch[] = [];
  if (Object.keys(set).length) patches.push({ set });
  if (unset.length) patches.push({ unset });
  return patches;
}
