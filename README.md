# Garry Hair Artist

Website and online booking for **Garry**, an independent hair artist in **Surrey, BC** — with a built-in content editor at `/studio`.

- **Public site:** Home, Services, About, Contact, Book online, Privacy policy.
- **Online booking:** clients pick a service, date and time; taken times show as **booked**; both Garry and the client get an email (with a calendar invite); clients can cancel through a private link.
- **Studio (`/studio`):** Garry manages bookings (Today / Upcoming / Pending lists and a week Calendar), time off, opening hours, services and prices, portfolio photos, testimonials and every page's text.

Design: a monochrome editorial look — near-black canvas, white "paper" panels, blackletter display type and a monospace body face — responsive from 320px phones to 2560px screens and built to WCAG 2.2 AA.

## Features

- **Pages** rendered from cached CMS content and prerendered as static shells (Next.js Cache Components) — fast first load, instant navigation.
- **Booking engine** in the business timezone (`America/Vancouver`): opening hours, slot interval, buffer between appointments, minimum notice, booking window, time off; double-booking protection with a per-day lock; optional manual confirmation. If Sanity is configured but can't be reached, booking pauses ("temporarily unavailable") instead of using the default services and hours.
- **Emails** via Resend: new-booking alert to Garry, client confirmation with `.ics`, cancellation emails both ways, contact-form notifications; status changes made in the Studio email the client through a Sanity webhook.
- **Content editing** in an embedded Sanity Studio, with instant publishing through a revalidation webhook. Every text field falls back to built-in default copy, so nothing breaks when a field is empty.
- **SEO:** per-page titles, descriptions and canonical URLs, generated Open Graph card and icons, `sitemap.xml` with images and real last-modified dates, `robots.txt`, web manifest and `HairSalon` structured data (hours, services and prices, booking action).
- **Privacy & security:** bookings and messages saved under private IDs that need a login or token to read, even on Sanity's free plan, server-only secrets, signed booking links, signed webhooks, same-origin checks on form submissions, rate-limited forms with spam checks, per-client booking limits (about 3 bookings per email in 24 hours, at most 2 upcoming appointments per email), security headers.

## Tech stack

| Area | Tools |
|---|---|
| Framework | [Next.js 16](https://nextjs.org) (App Router, Turbopack, Cache Components, Partial Prefetching), React 19, TypeScript (strict) |
| Styling | Tailwind CSS v4, `next/font` (Geist Mono + UnifrakturMaguntia) |
| CMS & database | [Sanity](https://www.sanity.io) v6 (Studio embedded at `/studio`), `next-sanity` (with its bundled `@sanity/client`) |
| Email | [Resend](https://resend.com) |
| Validation & dates | zod v4, date-fns v4 + `@date-fns/tz` |
| Tests & quality | Vitest, ESLint (`eslint-config-next`), `tsc` |
| Hosting | [Vercel](https://vercel.com) |

## Quick start

Requires **Node.js 24.x** (pinned in `package.json`; 22.12+ also runs locally) with timezone data **2026b or newer** — check with `node -p process.versions.tz`. BC stays on UTC−7 all year from 1 November 2026, and older timezone data puts appointments from then on an hour off in calendar invites. The server logs `[booking] Timezone data … predates 2026b` at startup when the data is too old.

### Without Sanity (look around in two minutes)

```bash
npm install
npm run dev
```

Open <http://localhost:3000>. With no Sanity project configured the site runs entirely on the built-in default content (`src/lib/content/fallback.ts`), bookings are saved to a local file (`.data/bookings.json`) and emails are printed in the terminal instead of being sent. The Studio needs a Sanity project, so `/studio` is not usable yet.

### With Sanity (the real setup)

```bash
cp .env.example .env.local     # then fill in the Sanity values (see below)
npm install
npm run seed                   # loads the default content and photos into Sanity (uses the token in .env.local)
npm run dev
```

- Website: <http://localhost:3000>
- Studio: <http://localhost:3000/studio>

Minimum `.env.local` for this: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET` and `SANITY_API_WRITE_TOKEN`. Every variable is documented in [`.env.example`](.env.example), and [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) walks through creating the Sanity project, CORS origins and tokens. Add `RESEND_API_KEY` to send real emails locally.

> The address, phone number, prices, durations and opening hours in the default content are **editable placeholders** based on the old website — confirm the real ones in the Studio before launch.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Start the development server at <http://localhost:3000> |
| `npm run build` | Production build |
| `npm run start` | Serve the production build (after `build`) |
| `npm run lint` | ESLint |
| `npm run typecheck` | Generate Next.js route types, then `tsc --noEmit` |
| `npm test` | Unit tests (Vitest) |
| `npm run seed` | Create the default content and photos in the configured Sanity dataset — only what's missing, never overwriting Studio edits, and skipping services / portfolio photos once any exist (`SEED_FORCE=1` resets everything seeded). Uses `SANITY_API_WRITE_TOKEN` from `.env.local` |

Before deploying: `npm run lint && npm run typecheck && npm test && npm run build`.

## Project structure

```
sanity.config.ts / sanity.cli.ts   Studio + Sanity CLI configuration
scripts/seed.ts                    Seeds Sanity with the default content
scripts/backfill-booking-durations.ts  One-off fix for old Studio bookings without a duration (see docs/DEPLOYMENT.md §11)
public/images/                     Garry's photos
src/app/
  layout.tsx                       <html>, fonts, default metadata
  (site)/                          Public pages inside the site chrome (marquee, header, footer)
  studio/                          Embedded Sanity Studio (/studio)
  api/                             Availability, bookings, contact form, webhooks
  sitemap.ts, robots.ts, manifest.ts, icon.tsx, apple-icon.tsx, opengraph-image.tsx
  not-found.tsx, global-error.tsx  404 and last-resort error pages
src/components/                    UI kit, layout chrome and page sections
src/lib/
  content/                         Content types, default copy, cached getters
  booking/                         Availability engine, stores, tokens, emails
  sanity/  email/  seo/            Sanity clients & queries, email sending, SEO helpers
src/sanity/                        Studio schemas, sidebar, Calendar tool, actions
```

Architecture, content model, caching rules, booking rules and the HTTP API are documented in **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

> This project uses Next.js 16, which differs from older versions (Cache Components, `revalidateTag(tag, profile)`, async `params`, …). Check `node_modules/next/dist/docs/` before changing framework-level code.

## Deployment

Hosted on Vercel with Sanity and Resend. **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** is a step-by-step runbook: Sanity project, CORS, tokens, Resend domain verification, secrets, Vercel environment variables, Node.js version and custom domain, a firewall rate limit for the form endpoints, the two Sanity webhooks, a post-launch checklist and troubleshooting.

## Editing content

Garry edits everything at `https://<domain>/studio`. **[docs/STUDIO_GUIDE.md](docs/STUDIO_GUIDE.md)** is a plain-language guide: bookings and the Calendar, confirming and cancelling, phone bookings, time off, hours and booking rules, services and prices, portfolio photos, testimonials (real reviews only) and page text.
