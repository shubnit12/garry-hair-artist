/**
 * Sanity client for maintenance scripts run with `sanity exec`.
 *
 * Reads the same settings as the website (.env.local, then .env) and
 * authenticates with SANITY_API_WRITE_TOKEN, so no `sanity login` is needed.
 * Without that token it falls back to the CLI login, which requires running
 * the script with `--with-user-token`.
 */

import { existsSync } from "node:fs";
import path from "node:path";

import { getCliClient } from "sanity/cli";

const ROOT = process.env.SANITY_BASE_PATH || process.cwd();

/** Values already in the environment win, then .env.local, then .env (as in Next.js). */
function loadEnvFiles() {
  for (const file of [".env.local", ".env"]) {
    const full = path.join(ROOT, file);
    if (existsSync(full)) process.loadEnvFile(full);
  }
}

loadEnvFiles();

export const SCRIPT_ROOT = ROOT;
export const API_VERSION = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2025-10-01";

export type ScriptClient = ReturnType<typeof getCliClient>;

export function createScriptClient(): ScriptClient {
  const projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  const dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  const token = process.env.SANITY_API_WRITE_TOKEN;
  if (!projectId) throw new Error("NEXT_PUBLIC_SANITY_PROJECT_ID is not set (add it to .env.local).");

  const client = getCliClient({
    apiVersion: API_VERSION,
    useCdn: false,
    projectId,
    dataset,
    ...(token ? { token } : {}),
  });
  // Without auth, bookings and messages (private IDs) are invisible, so a
  // script would quietly find nothing. `--with-user-token` also sets a token.
  if (!client.config().token) {
    throw new Error(
      "No Sanity token: set SANITY_API_WRITE_TOKEN in .env.local (or run the script with `--with-user-token` after `npx sanity login`).",
    );
  }
  return client;
}

/** One line for error output: what to check when a script can't reach Sanity. */
export const AUTH_HINT =
  "Check NEXT_PUBLIC_SANITY_PROJECT_ID and SANITY_API_WRITE_TOKEN (an Editor token) in .env.local.";
