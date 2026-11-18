import { defineCliConfig } from "sanity/cli";

/**
 * Sanity CLI configuration (used by `npx sanity ...` commands such as
 * `sanity exec`, `sanity dataset` and `sanity cors`). The Studio itself is
 * served by Next.js at /studio, so `sanity deploy` is not needed.
 */
export default defineCliConfig({
  api: {
    projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID,
    dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || "production",
  },
});
