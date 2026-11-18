/**
 * Node-only startup checks (imported from src/instrumentation.ts).
 *
 * Booking times are converted with the runtime's IANA timezone data. British
 * Columbia moved to permanent UTC−7 on 2026-11-01 (tzdata 2026b); an older
 * runtime would put winter appointments one hour off in calendar files and
 * minimum-notice checks. Fail loudly in the logs so it is caught on deploy.
 */
const tz = process.versions.tz;
if (tz && tz < "2026b") {
  console.error(
    `[booking] Timezone data ${tz} predates 2026b (BC permanent UTC−7). ` +
      "Upgrade the Node.js runtime (Vercel: Settings → Build and Deployment → Node.js Version) so appointment times stay correct.",
  );
}

export {};
