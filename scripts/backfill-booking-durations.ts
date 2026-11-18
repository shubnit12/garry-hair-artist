/**
 * One-off backfill: copies the referenced service's duration (plus its name and
 * slug, where missing) onto every booking that has no duration of its own.
 * Bookings only reference their service weakly, so without this a booking
 * shrinks to 60 minutes once its service is deleted or unpublished.
 *
 *   npx sanity exec scripts/backfill-booking-durations.ts -- --dry-run
 *   npx sanity exec scripts/backfill-booking-durations.ts
 *
 * Connects with NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN from
 * .env.local (see scripts/lib/script-client.ts).
 *
 * Safe to re-run: bookings that already have a duration are never touched, and
 * each patch only applies if the booking hasn't changed since it was read.
 * Imports are relative on purpose: path aliases are not guaranteed under
 * `sanity exec`.
 */

import { AUTH_HINT, createScriptClient } from "./lib/script-client";

const DRY_RUN = process.argv.includes("--dry-run");
const BATCH_SIZE = 100;

type Candidate = {
  _id: string;
  _rev: string;
  durationMinutes: unknown;
  serviceName?: string | null;
  serviceSlug?: string | null;
};

// Bookings are liveEdit, so the published documents are the real ones.
const CANDIDATES_QUERY = /* groq */ `*[
  _type == "booking" && !defined(durationMinutes) && defined(service->durationMinutes)
]{
  _id,
  _rev,
  "durationMinutes": service->durationMinutes,
  "serviceName": service->name,
  "serviceSlug": service->slug.current
}`;

const UNRESOLVABLE_QUERY = /* groq */ `count(*[
  _type == "booking" && !defined(durationMinutes) && !defined(service->durationMinutes) &&
  coalesce(status, "confirmed") in ["pending", "confirmed"]
])`;

function isDuration(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 5 && value <= 720;
}

async function main() {
  const client = createScriptClient();
  const { projectId, dataset } = client.config();
  console.log(`\nBackfilling booking durations in project "${projectId}", dataset "${dataset}"`);
  if (DRY_RUN) console.log("Dry run: nothing is written.");

  const options = { perspective: "published" as const };
  const candidates = (await client.fetch<Candidate[]>(CANDIDATES_QUERY, {}, options)).filter((booking) =>
    isDuration(booking.durationMinutes),
  );
  const unresolvable = await client.fetch<number>(UNRESOLVABLE_QUERY, {}, options);

  for (const booking of candidates) {
    console.log(`  ${DRY_RUN ? "would set" : "set"} ${booking._id}: ${booking.durationMinutes} min`);
  }

  if (!DRY_RUN) {
    for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
      const transaction = client.transaction();
      for (const booking of candidates.slice(index, index + BATCH_SIZE)) {
        transaction.patch(
          client
            .patch(booking._id)
            .ifRevisionId(booking._rev)
            .setIfMissing({
              durationMinutes: booking.durationMinutes,
              ...(booking.serviceName ? { serviceName: booking.serviceName } : {}),
              ...(booking.serviceSlug ? { serviceSlug: booking.serviceSlug } : {}),
            }),
        );
      }
      await transaction.commit({ visibility: "async" });
    }
  }

  console.log(`\nDone: ${candidates.length} booking(s) ${DRY_RUN ? "to update" : "updated"}.`);
  if (unresolvable > 0) {
    console.log(
      `${unresolvable} active booking(s) have no duration and no service to copy one from. ` +
        "Open them in the Studio (they show a warning) and enter the duration.",
    );
  }
  console.log("");
}

main().catch((error: unknown) => {
  console.error("\nBackfill failed:", error instanceof Error ? error.message : error);
  console.error(
    `${AUTH_HINT}\nA booking edited while this ran makes its batch fail; just run the command again.\n`,
  );
  process.exitCode = 1;
});
