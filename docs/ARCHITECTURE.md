# Architecture

Garry Hair Artist — marketing site + online booking for an independent hair artist in Surrey, BC.

- **Next.js 16.4** (App Router, Turbopack, **Cache Components + Partial Prefetching enabled**), React 19.3, TypeScript strict, Tailwind CSS v4.
- **Sanity** (v6 Studio embedded at `/studio`, `next-sanity` v13 — which bundles `@sanity/client` 7.x; import client types such as `SanityClient` from `next-sanity`) as headless CMS **and** booking datastore.
- **Resend** for transactional email. Hosted on **Vercel**.

> Next.js 16 differs from older versions. Read `node_modules/next/dist/docs/` before using an API you're unsure of. Key rules under Cache Components:
> - Data that can be shared across users goes in a `"use cache"` function with `cacheLife(...)` + `cacheTag(...)` (see `src/lib/content/get.ts`).
> - Anything reading request data (`searchParams`, `params` without `generateStaticParams`, `cookies()`, `headers()`, `connection()`), or uncached I/O, must render **inside a `<Suspense>` boundary**. Same for `new Date()` / `Math.random()` / `crypto.randomUUID()` in server render (or call `await connection()` first).
> - Route segment configs `dynamic`, `revalidate`, `fetchCache` **no longer exist**.
> - `GET` route handlers are prerendered unless they read the request (e.g. `request.nextUrl.searchParams`) — always read the request in dynamic handlers.
> - `next/image`: `priority` is deprecated → use `preload`. Allowed `quality` values: 60, 75, 85 (next.config.ts).
> - `revalidateTag(tag, profile)` takes a second argument.

## Directory map

```
sanity.config.ts            Studio config (basePath /studio)
sanity.cli.ts               CLI config (sanity exec / dataset / cors)
scripts/seed.ts             Seeds Sanity with the default content + images
scripts/backfill-booking-durations.ts   One-off: copies service durations onto bookings without one
public/images/*.jpg         Garry's photos (cropped, optimised)
src/instrumentation.ts      Server start-up hook → lib/runtime-checks.ts
src/app/
  layout.tsx                <html>, fonts, default metadata
  globals.css               Design tokens (Tailwind v4 @theme)
  (site)/layout.tsx         Marquee + Header + Footer (public pages)
  (site)/page.tsx           Home
  (site)/services|about|contact|privacy|book/page.tsx
  (site)/booking/[id]/page.tsx   Manage / cancel a booking (signed link)
  studio/[[...tool]]/       Embedded Sanity Studio
  api/availability          GET day slots
  api/availability/month    GET month overview
  api/bookings              POST create booking
  api/bookings/[id]         GET (signed) booking details
  api/bookings/[id]/cancel  POST (signed) cancel
  api/bookings/[id]/calendar GET (signed) .ics
  api/contact               POST contact form
  api/revalidate            Sanity webhook → revalidate content cache
  api/webhooks/booking-status  Sanity webhook → email client on status change
src/components/
  ui/        Button, ButtonLink, ArrowLink, SiteImage, Typography, Panel, icons
  layout/    Header, MobileMenu, NavLinks, Marquee, Footer, Logo
  home/ services/ about/ contact/ booking/   page-specific components
src/lib/
  env.ts / env.server.ts     typed env access (server secrets in env.server.ts)
  site.ts                    constants: timezone, nav, cache tag
  format.ts                  price/duration/time/hours formatting
  content/types.ts           UI content types (source-agnostic)
  content/fallback.ts        default content (used until Sanity is connected; also seed data)
  content/normalize.ts       raw Sanity → UI types, filling blanks from fallback
  content/get.ts             cached getters ("use cache") for Server Components
  sanity/client.ts           contentClient (CDN), liveClient (no CDN), writeClient (token)
  sanity/queries.ts          GROQ for content + SINGLETON_IDS
  sanity/image.ts            Sanity image → SiteImage
  booking/types.ts           HTTP contract types (AvailabilityResponse, PublicBooking…)
  booking/schema.ts          zod schemas shared by forms + API
  booking/*                  availability engine, store, tokens, ics…
  email/send.ts              sendEmail() via Resend (console in dev)
  email/layout.ts            branded HTML email helpers (escapeHtml, detailsTable, button…)
  email/recipients.ts        getOwnerRecipients()
  rate-limit.ts              rateLimit(), getClientIp(), isSuspiciouslyFast()
  runtime-checks.ts          start-up checks (logs when the runtime's tzdata predates 2026b)
src/sanity/
  schemaTypes/               Studio schemas (objects, singletons, documents)
  structure.ts               Studio sidebar
```

## Design system

Monochrome editorial look modelled on the client's reference ("Axiom Shear" barbershop template):

- Canvas `bg-ink` (#111) with `text-paper` (#fff). White "paper" panels (`theme-paper` class / `<PaperPanel>`) inset on the dark canvas for key sections, separated by **dashed** rules (`rule-dashed`).
- Display type: blackletter **UnifrakturMaguntia** (`font-blackletter`, `<DisplayHeading>`). Body/UI: **Geist Mono** (default `font-mono`). Small labels are uppercase mono with wide tracking (`<Eyebrow>`, `<MonoTitle>`).
- Muted text: `text-smoke` on ink, `text-ash` on paper. Lines: `border-ink-line` on ink, `rule-dashed` / `border-paper-line` on paper.
- Buttons: `<ButtonLink variant="ink">` on paper, `variant="paper"` on ink. `<ArrowLink>` = underlined link with chevron.
- Layout width: `container-site` utility (max 1440px, 16px gutters mobile / 24px ≥640px).
- Fluid display sizes via `clamp()`; everything must work from 320px to 2560px wide. No horizontal scrolling on phones.
- Motion: subtle (`animate-fade-up`, marquee). Respect `prefers-reduced-motion` (handled globally).
- Accessibility: WCAG 2.2 AA — semantic landmarks/headings, visible focus, labelled controls, 44px touch targets, `aria-live` for async updates, alt text.

## Content model

All editable copy has a fallback in `content/fallback.ts`, so the site renders fully before Sanity is connected. Singletons use fixed IDs (`SINGLETON_IDS`). `getX()` getters in `content/get.ts` are cached (`cacheLife("minutes")`, tag `sanity-content` + type tag) and refreshed instantly by the `/api/revalidate` webhook.

**Never invent testimonials** — `fallbackTestimonials` is empty on purpose; the section hides when there are none.

## Booking system

Timezone: everything is computed in `America/Vancouver` (`BUSINESS_TIMEZONE`), regardless of server or client timezone.

**Timezone data (tzdata ≥ 2026b required).** Wall-clock ↔ UTC conversion (`zonedToUtc`, minimum-notice checks, the UTC `DTSTART`/`DTEND` in `.ics` files) uses the runtime's IANA data. BC stays on UTC−7 all year from 2026-11-01, which only tzdata 2026b+ knows; older data converts those appointments with UTC−8, one hour off (the site still lists the right local times, but calendar invites and notice cut-offs are wrong). Run Node.js 24.x and check `node -p process.versions.tz`. At server start, `lib/runtime-checks.ts` (via `instrumentation.ts`) logs `[booking] Timezone data <version> predates 2026b …` when the data is too old; it does not stop the server, so check the logs after each deploy (DEPLOYMENT.md §7.2).

**Source of truth for an appointment** = `date` (YYYY-MM-DD) + `time` (HH:mm) + `durationMinutes` (falls back to the referenced service's duration, then 60). `start`/`end` (UTC ISO) are convenience copies written by the website. The website stores `durationMinutes` on every booking; the Studio fills it in from the chosen service and warns when it differs from the service's duration, so a booking keeps its length when a service's duration changes later. Older Studio bookings without a duration are fixed once with `scripts/backfill-booking-durations.ts` (usage in its header and DEPLOYMENT.md §11); bookings reference their service weakly, so without a stored duration a booking shrinks to 60 minutes if its service is deleted.

**Active** bookings are those with status `pending` or `confirmed` (`completed`/`cancelled`/`no-show` never block time).

**Slot rules** (`slotIntervalMinutes`, `bufferMinutes`, `minNoticeMinutes`, `maxAdvanceDays`, `weeklyHours` from Booking settings; time off from `timeOff` docs):
- Candidate starts: from opening time, every `slotIntervalMinutes`, while `start + duration <= close`.
- An existing booking blocks `[bStart, bEnd + buffer)`. A candidate `[s, s + duration)` conflicts when `s < bEnd + buffer && s + duration + buffer > bStart`.
- Status: `booked` if `s` falls inside an existing appointment `[bStart, bEnd)`; `unavailable` if past/inside min-notice, overlapping time off, or otherwise conflicting (buffer, or would run into the next booking); else `available`.
- Days outside `[today, today + maxAdvanceDays]` are unavailable; closed weekdays and all-day time off are closed.

**Double-booking protection**: the server re-validates the slot on POST. Creation is serialised per day using a `bookingDayLock` document (`_id: "bookingDayLock.<hmac>"`, where `<hmac>` is a keyed hash of the date from `dayLockId()` — the document endpoint reveals whether an ID exists, so a plain date would reveal which days have bookings): read its `_rev` → re-check conflicts with an uncached query → commit a transaction that patches the lock `ifRevisionId(rev)` **and** creates the booking. A concurrent booking changes the revision, so the losing transaction fails and is retried (then rejected with `SLOT_TAKEN` if the slot is gone).

**Lock `entries` safeguard**: the same transaction appends `{ _key: <booking uuid>, time, durationMinutes, createdAt }` (the ID without its `booking.` prefix) to the lock's `entries` array. The lock is read through the document endpoint, which is consistent with its revision, but the GROQ query index used for the conflict re-check can trail a just-committed booking for a moment. So `busyFromLock()` (`booking/store/sanity.ts`) also treats as busy any entry the query doesn't return yet and that is younger than 10 minutes (`LOCK_ENTRY_TTL_MS`). Entries the query does return are judged by the query, so a cancelled booking frees its slot straight away. Without this, a second booking for the same slot made moments after the first would read the new lock revision, miss the first booking in the lagging query, and commit.

**Fail closed**: when Sanity is configured, the booking path (availability and booking creation) reads services and Booking settings live from Sanity. If Sanity can't be reached, these endpoints answer `503 UNAVAILABLE` ("Online booking is temporarily unavailable") instead of falling back to `content/fallback.ts`, whose default services and hours could accept bookings Garry can't take. Display pages still use the fallbacks. Without a Sanity project (local development) the defaults are used.

**Abuse limits** (`POST /api/bookings`): honeypot field and minimum fill time; per IP 5 requests / 10 min; then, only for a request that would otherwise succeed, at most 2 active upcoming bookings per email address (counted in the store) and about 3 bookings per email address / 24 h. Matching is by email only: matching phone numbers too would let anyone check whether a number they know has upcoming appointments. Both per-client limits answer an identical `429 RATE_LIMITED` (same message `MESSAGES.bookingLimit`, no `Retry-After`) asking the client to contact Garry — clients can't change a booking online (only cancel it with the signed link). Other per-IP limits: cancel 10 / 10 min, contact 5 / 10 min. The in-memory limiter (`rate-limit.ts`, used for the per-IP and per-email limits) counts per server instance, so production should also have a Vercel Firewall rate-limit rule on `POST /api/bookings` and `POST /api/contact` (DEPLOYMENT.md §7.4). Bookings created in the Studio bypass all of these.

**Same-origin check**: `POST /api/bookings`, `POST /api/bookings/[id]/cancel` and `POST /api/contact` reject a request with `403 FORBIDDEN` when its `Origin` header's host differs from the request host (`x-forwarded-host`, else `Host`). Requests without an `Origin` header (non-browser clients) pass — it is a CSRF guard, not authentication.

**Manage links**: `PublicBooking.manageUrl = /booking/<uuid>?token=<t>`, where `<uuid>` is the document ID without its `booking.` prefix (`bookingSlug`; routes restore it with `bookingIdFromSlug`) and `t = base64url(HMAC-SHA256(BOOKING_TOKEN_SECRET, <full document id>))`. Verified with `timingSafeEqual`. Only IDs under `booking.` are ever looked up (`isBookingId`).

**Stores**: Sanity store when `writeClient` exists and `BOOKING_TOKEN_SECRET` is set (in every environment — the built-in development secret is only ever used with the local store, because the secret also keys the day-lock IDs in a dataset the live site shares); a local JSON store (`.data/bookings.json`) in development or when `BOOKING_STORE=local`; otherwise booking endpoints return `503 UNAVAILABLE`.

**Notifications**: on create → owner email (all `getOwnerRecipients()`) + client confirmation, both with an `.ics`. Client self-cancel → client + owner emails. Owner changes status in the Studio → Sanity webhook `/api/webhooks/booking-status` emails the client (cancelled, or pending→confirmed), deduplicated with `notifiedStatus`.

### Webhooks (Sanity → website)

Both are GROQ webhooks created in sanity.io/manage → API → Webhooks (field-by-field in DEPLOYMENT.md §8), with HTTP method `POST`, drafts/versions off, and the signature verified by `parseBody` from `next-sanity/webhook`. Secret not set on the server → `500`; missing or invalid signature → `401`; unreadable body → `400`.

| | Revalidate website | Booking status emails |
|---|---|---|
| URL | `POST /api/revalidate` | `POST /api/webhooks/booking-status` |
| Trigger on | Create, Update, Delete | **Update** only |
| Filter | `!(_type in ["booking", "timeOff", "contactMessage", "bookingDayLock"])` | `_type == "booking" && delta::changedAny(status)` |
| Projection | `{_type}` | `{_id}` |
| Secret | `SANITY_REVALIDATE_SECRET` | `SANITY_WEBHOOK_SECRET` |
| Effect | `revalidateTag(tag, { expire: 0 })` for `sanity-content` + the type tag | Emails the client when Garry cancels (not when the client cancelled) or confirms a pending booking; skips past appointments and bookings without an email. Verified no-ops get `200`; a failed email returns `5xx` so Sanity retries. |

### HTTP API (see `src/lib/booking/types.ts`)

| Method | Path | Body / query | Success | Errors |
|---|---|---|---|---|
| GET | `/api/availability` | `?service=<slug>&date=YYYY-MM-DD` | `AvailabilityResponse` | 400, 404, 503 |
| GET | `/api/availability/month` | `?service=<slug>&month=YYYY-MM` | `MonthAvailabilityResponse` | 400, 404, 503 |
| POST | `/api/bookings` | `BookingRequest` JSON | 201 `CreateBookingResponse` | 400 VALIDATION, 403 FORBIDDEN (cross-origin), 409 SLOT_TAKEN, 429 RATE_LIMITED (per IP / per email), 503 UNAVAILABLE (incl. Sanity unreachable) |
| GET | `/api/bookings/[id]` | `?token=` | `{ booking: PublicBooking; canCancel: boolean; cancellationPolicy: string }` | 403, 404, 503 |
| POST | `/api/bookings/[id]/cancel` | `{ token }` | `{ booking: PublicBooking }` | 403 (bad token or cross-origin), 404, 409 **VALIDATION** (already cancelled, already started or no longer active — never `SLOT_TAKEN`), 429, 503 |
| GET | `/api/bookings/[id]/calendar` | `?token=` | `text/calendar` | 403, 404, 503 |
| POST | `/api/contact` | `ContactMessageRequest` JSON | `{ ok: true }` | 400 VALIDATION, 403 FORBIDDEN (cross-origin), 413 (body over 10 KB), 415 (not JSON), 429, 500 SERVER, 503 UNAVAILABLE (neither saved nor emailed) |

All errors are `ApiError` JSON (`{ error, message, fieldErrors? }`); any endpoint can also answer `500 SERVER` on an unexpected error. All booking endpoints send `Cache-Control: no-store`. `/api/contact` succeeds when the message was saved to Sanity **or** emailed to the owner — without `SANITY_API_WRITE_TOKEN` it is emailed only.

## Environment variables

See `.env.example`. Public: `NEXT_PUBLIC_SANITY_PROJECT_ID`, `NEXT_PUBLIC_SANITY_DATASET`, `NEXT_PUBLIC_SANITY_API_VERSION`, `NEXT_PUBLIC_SITE_URL` (falls back to Vercel's `VERCEL_PROJECT_PRODUCTION_URL` / `VERCEL_URL`). Secret: `SANITY_API_WRITE_TOKEN`, `SANITY_API_READ_TOKEN` (optional), `SANITY_REVALIDATE_SECRET`, `SANITY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `BOOKING_NOTIFICATION_EMAIL`, `BOOKING_TOKEN_SECRET`, `BOOKING_STORE` (optional `local`).

**Privacy on a public dataset.** The Free plan's datasets are public, so documents holding personal data use private IDs (`src/lib/private-ids.ts`): `booking.<uuid>` and `contactMessage.<uuid>`. Sanity only returns documents whose `_id` contains a dot to logged-in users and token holders. The website creates these IDs (`newPrivateId`). In the Studio, the built-in create menus and the Duplicate action are switched off for both types (`newDocumentOptions`, `initialValueTemplates([])`, `document.actions` in `sanity.config.ts`), and bookings are added through Bookings → New booking or the Calendar, which open a create intent with a fresh private `id`. A document-level validation flags any booking or message found under a public ID. Day locks are private too, with a keyed hash instead of the date in their ID. Time off and all page content stay public — including **Booking settings → Notification emails**, so private inboxes belong in `BOOKING_NOTIFICATION_EMAIL`. Anonymous users can also read the *history* of any public-ID document, which is why a booking or message saved under a public ID counts as exposed even after it is deleted.

Runtime: Node.js 24.x (`engines` allows 22.12+) whose tzdata is 2026b or newer — see [Booking system](#booking-system).
