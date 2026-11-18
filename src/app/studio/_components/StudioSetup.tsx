import type { ReactNode } from "react";

import { buttonClasses } from "@/components/ui/Button";
import { DisplayHeading, Eyebrow } from "@/components/ui/Typography";

/**
 * Shown at /studio until a Sanity project is connected (no
 * NEXT_PUBLIC_SANITY_PROJECT_ID). Lists variable NAMES only — never values.
 */

type EnvVar = { name: string; note: string };

const STUDIO_VARS: EnvVar[] = [
  { name: "NEXT_PUBLIC_SANITY_PROJECT_ID", note: "Required. Your project ID from sanity.io/manage." },
  { name: "NEXT_PUBLIC_SANITY_DATASET", note: "Optional. Defaults to “production”." },
  { name: "NEXT_PUBLIC_SANITY_API_VERSION", note: "Optional. Pins the Sanity API version (YYYY-MM-DD)." },
];

const SERVER_VARS: EnvVar[] = [
  { name: "SANITY_API_WRITE_TOKEN", note: "Editor token so the website can save and read bookings and messages." },
  { name: "SANITY_API_READ_TOKEN", note: "Optional Viewer token for reads; the Editor token is used if empty." },
  { name: "SANITY_REVALIDATE_SECRET", note: "Shared secret for the content-refresh webhook." },
  { name: "SANITY_WEBHOOK_SECRET", note: "Shared secret for the booking-status email webhook." },
];

function Code({ children }: { children: ReactNode }) {
  return <code className="[overflow-wrap:anywhere] bg-ink-soft px-1.5 py-0.5 text-paper">{children}</code>;
}

function VarList({ vars }: { vars: EnvVar[] }) {
  return (
    <dl className="divide-y divide-ink-line border-t border-ink-line">
      {vars.map((variable) => (
        <div key={variable.name} className="grid gap-1 py-3 sm:grid-cols-[minmax(0,22rem)_1fr] sm:gap-6">
          <dt className="text-[13px]">
            <Code>{variable.name}</Code>
          </dt>
          <dd className="text-[13px] leading-relaxed text-smoke">{variable.note}</dd>
        </div>
      ))}
    </dl>
  );
}

function Step({ number, title, children }: { number: number; title: string; children: ReactNode }) {
  return (
    <li className="grid gap-4 border-t border-ink-line pt-8 sm:grid-cols-[4rem_1fr]">
      <span aria-hidden="true" className="font-mono text-xs tracking-[0.2em] text-smoke">
        {String(number).padStart(2, "0")}
      </span>
      <div className="min-w-0 space-y-4">
        <h2 className="font-mono text-sm uppercase tracking-[0.14em]">{title}</h2>
        <div className="space-y-4 text-sm leading-relaxed text-smoke">{children}</div>
      </div>
    </li>
  );
}

export function StudioSetup() {
  return (
    <main id="main" className="min-h-dvh bg-ink text-paper">
      <div className="container-site py-16 sm:py-24">
        <div className="max-w-3xl">
          <Eyebrow className="text-smoke">Garry Hair Artist · Content studio</Eyebrow>
          <DisplayHeading as="h1" size="lg" className="mt-6">
            Connect Sanity
          </DisplayHeading>
          <p className="mt-6 max-w-2xl text-sm leading-relaxed text-smoke sm:text-[15px]">
            The studio is where services, photos, opening hours and bookings are managed. It needs a Sanity
            project before it can open. Until one is connected, the website keeps running on its built-in
            default content.
          </p>

          <ol className="mt-14 space-y-10" aria-label="Setup steps">
            <Step number={1} title="Create a Sanity project">
              <p>
                Create a free project at{" "}
                <a
                  href="https://www.sanity.io/manage"
                  className="text-paper underline underline-offset-4"
                  target="_blank"
                  rel="noreferrer"
                >
                  sanity.io/manage<span className="sr-only"> (opens in a new tab)</span>
                </a>{" "}
                with a dataset called <Code>production</Code>. The free plan is enough: bookings and messages
                are saved under private IDs that only signed-in users and the website&apos;s token can read.
              </p>
            </Step>

            <Step number={2} title="Add the environment variables">
              <p>
                Add these to <Code>.env.local</Code> for local development and to Vercel → Project → Settings
                → Environment Variables for the live site:
              </p>
              <VarList vars={STUDIO_VARS} />
              <p>The website also needs these server-only secrets for bookings and emails:</p>
              <VarList vars={SERVER_VARS} />
            </Step>

            <Step number={3} title="Allow this website to use the API">
              <p>
                In sanity.io/manage → API → CORS origins, add this site&apos;s address (for example{" "}
                <Code>http://localhost:3000</Code> and your live domain) with{" "}
                <strong className="text-paper">Allow credentials</strong> switched on.
              </p>
            </Step>

            <Step number={4} title="Restart and load the default content">
              <p>
                Restart the dev server or redeploy on Vercel, then reload this page and sign in. To copy the
                website&apos;s default text and photos into Sanity, run:
              </p>
              <pre className="whitespace-pre-wrap break-words bg-ink-soft p-4 text-[13px] text-paper">
                <code>npm run seed</code>
              </pre>
            </Step>
          </ol>

          <p className="mt-14 border-t border-ink-line pt-8 text-sm leading-relaxed text-smoke">
            Full step-by-step instructions are in <Code>docs/DEPLOYMENT.md</Code> in the project repository.
          </p>

          <div className="mt-10">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- a full page load, so /studio's styles never carry over to the site */}
            <a href="/" className={buttonClasses("paper")}>
              Back to the website
            </a>
          </div>
        </div>
      </div>
    </main>
  );
}
