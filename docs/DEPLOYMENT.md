# Deployment runbook

Everything needed to take the Garry Hair Artist website from this repository to a live site at your own domain, with the content editor (Sanity Studio) at `https://<your-domain>/studio`, online booking and email notifications.

Follow the steps in order. Each one says **where** to click or **what** to type. Commands are run in a terminal from the project folder (the one containing `package.json`).

| You will need | Cost |
|---|---|
| A [GitHub](https://github.com) account (to hold the code) | Free |
| A [Sanity](https://www.sanity.io) account — content + bookings database | Free plan is enough |
| A [Resend](https://resend.com) account — sends the emails | Free plan is enough to start |
| A [Vercel](https://vercel.com) account — hosts the website | Free "Hobby" plan works; "Pro" is recommended for a business |
| Access to the DNS settings of your domain (e.g. `garryhairartist.com`) | — |
| [Node.js](https://nodejs.org) **24.x** (22.12 or newer works) with timezone data **2026b or newer** — see [step 4](#4-run-the-site-on-your-computer) — and Git on your computer | Free |

> **Placeholders.** `<domain>` below means your real domain, e.g. `garryhairartist.com`. `<project-id>` is your Sanity project ID. Never paste secrets (tokens, API keys) anywhere except `.env.local` on your computer and Vercel's Environment Variables screen.

---

## Contents

1. [Create the Sanity project](#1-create-the-sanity-project)
2. [Allow the Studio to talk to Sanity (CORS)](#2-allow-the-studio-to-talk-to-sanity-cors)
3. [Create the API tokens](#3-create-the-api-tokens)
4. [Run the site on your computer](#4-run-the-site-on-your-computer)
5. [Set up email (Resend)](#5-set-up-email-resend)
6. [Generate the secrets](#6-generate-the-secrets)
7. [Deploy to Vercel and connect the domain](#7-deploy-to-vercel-and-connect-the-domain)
8. [Create the two Sanity webhooks](#8-create-the-two-sanity-webhooks)
9. [Post-launch checklist](#9-post-launch-checklist)
10. [Troubleshooting](#10-troubleshooting)
11. [Maintenance](#11-maintenance)

---

## 1. Create the Sanity project

Sanity stores the website text, services, photos **and the bookings**. The **Free plan** is enough.

> **How client details stay private.** On the Free plan the dataset is **public**: anyone who knows the project ID can read the website content through Sanity's API. That's fine for text, services and photos, which the website shows anyway. Bookings and contact messages are protected differently. The website saves each one under an ID containing a dot (`booking.…`, `contactMessage.…`), and Sanity never returns such documents to anyone who isn't logged in or using a token ([Sanity docs](https://www.sanity.io/docs/content-lake/ids)). The Studio's **New booking** buttons create bookings the same way. **Time off** is not private: keep its "reason" general (e.g. "Holiday").
>
> Sanity's paid Growth plan adds private datasets, but they aren't needed here. New projects start on a Growth **trial**; when it ends the project moves to Free and any private dataset becomes public. The private IDs keep bookings protected either way.

**In the browser (easiest)**

1. Go to <https://www.sanity.io/manage> and sign up / log in.
2. Click **Create new project** and name it `Garry Hair Artist`. If you're asked about a dataset, keep the name `production`; public or private both work.
3. Open the project → **Datasets**. If there's no `production` dataset, click **Add dataset** and name it `production`.
4. Copy the **Project ID** shown at the top of the project page (8 characters, e.g. `a1b2c3d4`). It isn't a secret.

**Terminal alternative**

```bash
npm install                     # once, installs the Sanity CLI used below
npx sanity login                # opens the browser to log in
npx sanity projects create "Garry Hair Artist" --dataset production
```

The last command prints the new project ID.

**Give Garry access to the Studio.** In <https://www.sanity.io/manage> → project → **Members** → **Invite members**, enter Garry's email and choose **Administrator** (on the Free plan the only other role, Viewer, can't edit). Garry logs in to the Studio with that account.

---

## 2. Allow the Studio to talk to Sanity (CORS)

The Studio runs inside the website at `/studio`, so each address it is opened from must be allowed **with credentials** (that is what lets you stay logged in).

In <https://www.sanity.io/manage> → project → **API** settings → **CORS origins** → **Add CORS origin**, enter each origin exactly (`http://` or `https://`, no trailing slash), tick **Allow credentials** and save:

- `http://localhost:3000` (the Studio on your computer)
- `https://<domain>` (add it once the domain is set up, step 7)
- `https://www.<domain>`, only if the site will also be reachable on www

Terminal alternative:

```bash
npx sanity cors add http://localhost:3000 --credentials
npx sanity cors add https://<domain> --credentials
```

> Opening the Studio on a Vercel preview URL (e.g. `https://garry-hair-artist-git-feature-….vercel.app`) needs that origin added too. Most people only use the Studio on the live domain.

---

## 3. Create the API tokens

The website needs a token to **save and read bookings and contact messages**: their private IDs are invisible without one.

1. manage → project → **API** settings → **Tokens** → **Add API token**.
2. Name: `Website (Editor)` · Permissions: **Editor** → **Save**.
3. Copy the token now (it is shown only once). This is `SANITY_API_WRITE_TOKEN`.
4. *(Optional)* Add a second token `Website (Viewer)` with **Viewer** permissions → `SANITY_API_READ_TOKEN`. If you skip it, the Editor token is used for reading too.

Terminal alternative:

```bash
npx sanity tokens create "Website (Editor)" --role=editor
npx sanity tokens create "Website (Viewer)" --role=viewer   # optional
```

> Without `SANITY_API_WRITE_TOKEN`, **online booking is switched off** (the booking page says "temporarily unavailable"), and contact-form messages are still emailed to Garry but **not saved** in the Studio. Website content still loads without a token. If a token ever leaks, delete it in the same screen and create a new one.

---

## 4. Run the site on your computer

In a terminal, open the project folder (the one containing `package.json`) and check the Node.js version and its timezone data:

```bash
node -v                     # v24.x recommended (v22.12 or newer works)
node -p process.versions.tz # must print 2026b or later
```

> **Why the timezone data matters.** British Columbia stops changing the clocks: from **1 November 2026** it stays on UTC−7 all year instead of falling back to UTC−8. Only timezone data **2026b** and newer knows this. With older data, every appointment from that date on is one hour off in calendar invites (`.ics`) and minimum-notice checks. If the second command prints something older (e.g. `2025b`), install the latest Node.js 24 release from <https://nodejs.org> and check again.

Then create your local settings file:

```bash
cp .env.example .env.local
```

Open `.env.local` in a text editor and fill in at least:

```dotenv
NEXT_PUBLIC_SANITY_PROJECT_ID=<project-id>
NEXT_PUBLIC_SANITY_DATASET=production
SANITY_API_WRITE_TOKEN=<editor token from step 3>
BOOKING_TOKEN_SECRET=<output of: openssl rand -base64 32>
```

`BOOKING_TOKEN_SECRET` is needed locally because your computer writes bookings to the same Sanity dataset as the live site. Use the **same value** in Vercel later (step 7), so both lock the same days.

Every variable is explained in [`.env.example`](../.env.example). Then:

```bash
npm install
npm run seed            # loads the default text, services, hours and photos into Sanity
npm run dev
```

- Website: <http://localhost:3000>
- Studio: <http://localhost:3000/studio> — log in with the same Sanity account.

`npm run seed` connects with the project ID and `SANITY_API_WRITE_TOKEN` from `.env.local` (no `sanity login` needed). It only creates documents that don't exist yet, so it is safe to run again — it never overwrites edits made in the Studio, and once any services or portfolio photos exist it leaves those lists alone (so services or photos Garry deleted don't come back). `SEED_FORCE=1 npm run seed` deliberately resets the seeded documents to the defaults, overwriting those edits. It never creates bookings or testimonials. Everything it adds (prices, durations, hours, contact details, address) is a **starting placeholder** adapted from the old website — Garry should review and correct it in the Studio before launch.

> **No Sanity yet?** Leave `NEXT_PUBLIC_SANITY_PROJECT_ID` empty and just run `npm install && npm run dev`. The site runs on the built-in default content, bookings are saved to `.data/bookings.json`, and emails are printed in the terminal instead of being sent.

---

## 5. Set up email (Resend)

The site sends: a new-booking email to Garry, a confirmation (with calendar invite) to the client, cancellation emails, and contact-form messages.

1. Sign up at <https://resend.com>.
2. **Domains** → **Add domain** → enter `<domain>` (or a subdomain such as `mail.<domain>`) → pick the region closest to you (e.g. North America).
3. Resend shows the DNS records to add: a **TXT** DKIM record named `resend._domainkey`, plus the sending records for the `send` subdomain (currently two **CNAME** records, `send` and `rsend`; older accounts showed an **MX** and a **TXT** for `send`). Add each one **exactly as Resend shows it** at your DNS provider, using the copy button so long values aren't cut off. Most providers (Hostinger included) add the domain to the name themselves, so type only `send`, `rsend` or `resend._domainkey`. If Resend offers a **receiving** (inbound email) option, leave it off: Garry's mail already arrives in his existing mailbox, and an extra MX record for the domain would divert it. If the domain has no DMARC record yet, add one for deliverability:

   | Type | Name | Value |
   |---|---|---|
   | TXT | `_dmarc` | `v=DMARC1; p=none;` |

4. Click **Verify DNS records** and wait until the domain shows **Verified** (minutes to a few hours).
5. **API Keys** → **Create API key** → permission **Sending access**, domain `<domain>` → copy it.

Values for `.env.local` / Vercel:

```dotenv
RESEND_API_KEY=re_...
EMAIL_FROM="Garry Hair Artist <garry@<domain>>"
BOOKING_NOTIFICATION_EMAIL=<Garry's inbox, e.g. garry@<domain>>
```

`EMAIL_FROM` **must** use the verified domain and should be a **real mailbox** Garry reads: client emails say "just reply to this email" and replies go to the sender address. `BOOKING_NOTIFICATION_EMAIL` can hold several addresses separated by commas; Garry can add more later in the Studio (Booking settings → Notification emails), but addresses entered there are readable by anyone through Sanity's API — keep private inboxes in `BOOKING_NOTIFICATION_EMAIL`.

> Adding Resend's records does **not** affect an existing mailbox on the domain — do not delete existing MX records for the root domain if Garry already receives email there.

---

## 6. Generate the secrets

Three random secrets protect the booking links and the webhooks. Create each one separately:

```bash
openssl rand -base64 32   # → BOOKING_TOKEN_SECRET
openssl rand -base64 32   # → SANITY_REVALIDATE_SECRET
openssl rand -base64 32   # → SANITY_WEBHOOK_SECRET
```

No `openssl` (Windows)? Use `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.

| Secret | Used for | If it changes later |
|---|---|---|
| `BOOKING_TOKEN_SECRET` | Signs the "manage / cancel my booking" links in client emails, and keys the booking engine's day locks | Links in already-sent emails stop working (day locks simply start afresh) |
| `SANITY_REVALIDATE_SECRET` | Verifies the "Revalidate website" webhook (step 8) | Update the webhook's secret too |
| `SANITY_WEBHOOK_SECRET` | Verifies the "Booking status emails" webhook (step 8) | Update the webhook's secret too |

Keep a copy in a password manager.

---

## 7. Deploy to Vercel and connect the domain

### 7.1 Put the code on GitHub

Create a **private** repository on GitHub and push this project to it (`git push`). `.env.local` is ignored by Git and is never uploaded — that is intended.

### 7.2 Import the project

1. <https://vercel.com/new> → **Import** the GitHub repository.
2. **Framework Preset**: Next.js (detected automatically). Leave the build and install commands at their defaults.
3. **Root Directory**: the folder that contains `package.json` (leave as `./` if it is the repository root).
4. Open **Environment Variables** and add every variable below for the **Production** environment (tick **Preview** as well if you want working preview deployments):

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | `https://<domain>` — the final address, no trailing slash |
| `NEXT_PUBLIC_SANITY_PROJECT_ID` | `<project-id>` |
| `NEXT_PUBLIC_SANITY_DATASET` | `production` |
| `NEXT_PUBLIC_SANITY_API_VERSION` | `2025-10-01` |
| `SANITY_API_WRITE_TOKEN` | Editor token (step 3) |
| `SANITY_API_READ_TOKEN` | Viewer token (optional) |
| `SANITY_REVALIDATE_SECRET` | from step 6 |
| `SANITY_WEBHOOK_SECRET` | from step 6 |
| `BOOKING_TOKEN_SECRET` | from step 6 |
| `RESEND_API_KEY` | from step 5 |
| `EMAIL_FROM` | `Garry Hair Artist <garry@<domain>>` (a real mailbox) |
| `BOOKING_NOTIFICATION_EMAIL` | Garry's inbox |

Do **not** set `BOOKING_STORE` on Vercel.

5. Click **Deploy** and wait for the build to finish (a few minutes).
6. In the project → **Settings** → **Build and Deployment** → **Node.js Version**, select **24.x** and save, then **Redeploy** (Deployments → latest → **⋯** → **Redeploy**). The runtime must have timezone data **2026b or newer** — see [step 4](#4-run-the-site-on-your-computer) for why. (`package.json` pins `"engines": { "node": "24.x" }`, which takes precedence over this setting, so Vercel stays on Node.js 24 and never jumps to a new major version on its own. To move to a newer major later, change it there. The build log shows which version was used.)
7. **Check the timezone data after every deploy.** Open the live site once (so a server starts), then go to the project → **Logs** and search for `Timezone data`. A line like `[booking] Timezone data 2025b predates 2026b …` means this runtime has old data and appointments from 1 November 2026 will be an hour off in calendar invites: select the newest Node.js version offered, redeploy and check again. No such line = all good. (The [post-launch checklist](#9-post-launch-checklist) includes a booking test that confirms it end to end.)

> `NEXT_PUBLIC_*` values are baked in when the site is built. After changing any of them, go to **Deployments** → latest → **⋯** → **Redeploy**.

### 7.3 Add the custom domain

1. Project → **Settings** → **Domains** → **Add** → `<domain>`. Accept the suggestion to also add `www.<domain>` redirecting to it (or the other way round — but then use the www address in `NEXT_PUBLIC_SITE_URL` and CORS).
2. Vercel shows the DNS records to create — usually an **A** record for `@` and a **CNAME** for `www`. Create them at your DNS provider **with the exact values Vercel shows**, replacing the records that point to the old website host. Leave unrelated records (MX, Resend's TXT records) untouched.
3. Wait for both domains to show a green **Valid Configuration**. Vercel issues the HTTPS certificate automatically.
4. Make sure `NEXT_PUBLIC_SITE_URL` matches the main domain exactly, then **Redeploy** if you changed it.

### 7.4 Add a firewall rate limit (recommended)

The booking and contact forms already limit how often one visitor can submit, but each Vercel server instance counts separately, so a determined bot spread over several instances gets more tries. A Vercel Firewall rule counts across the whole site.

Project → **Firewall** → **Configure** → **New Rule** (labels can differ slightly):

| Field | Value |
|---|---|
| Name | `Limit form submissions` |
| If | **Request Path** equals `/api/bookings` **and** **Method** equals `POST` |
| Or | **Request Path** equals `/api/contact` **and** **Method** equals `POST` |
| Then | **Rate Limit** — fixed window, **10 minutes** (600 seconds), **5 requests**, keyed by **IP address**, action **Too Many Requests (429)** |

Save the rule, then **Review Changes** → **Publish**. Failed attempts count too, so don't go below 5 requests. Check Vercel's Firewall documentation for how many rate-limit rules your plan includes — this one rule is enough.

---

## 8. Create the two Sanity webhooks

Webhooks let Sanity tell the website when something changed. In <https://www.sanity.io/manage> → project → **API** → **Webhooks** → **Create webhook**, create both. Use the main domain in the URLs — the one that does **not** redirect (webhooks don't follow redirects).

### Webhook 1 — "Revalidate website"

Makes published content changes appear on the site immediately.

| Field | Value |
|---|---|
| Name | `Revalidate website` |
| URL | `https://<domain>/api/revalidate` |
| Dataset | `production` |
| Trigger on | ☑ Create ☑ Update ☑ Delete |
| Filter | `!(_type in ["booking", "timeOff", "contactMessage", "bookingDayLock"])` |
| Projection | `{_type}` |
| Status | Enabled |
| HTTP method | `POST` |
| HTTP headers | *(none)* |
| API version | `v2025-02-19` (or later) |
| Drafts / versions | Off (default) |
| Secret | the value of `SANITY_REVALIDATE_SECRET` |

### Webhook 2 — "Booking status emails"

Emails the client when Garry confirms a pending booking or cancels a booking in the Studio.

| Field | Value |
|---|---|
| Name | `Booking status emails` |
| URL | `https://<domain>/api/webhooks/booking-status` |
| Dataset | `production` |
| Trigger on | ☑ Update only |
| Filter | `_type == "booking" && delta::changedAny(status)` |
| Projection | `{_id}` |
| Status | Enabled |
| HTTP method | `POST` |
| API version | `v2025-02-19` (or later) |
| Drafts / versions | Off (default) |
| Secret | the value of `SANITY_WEBHOOK_SECRET` |

> Bookings live under private IDs, and Sanity's docs don't say whether webhooks fire for those. The "Studio status emails" check in the [post-launch checklist](#9-post-launch-checklist) confirms it does: the attempts log must show a `200`.

Each webhook has an **attempts log** (open the webhook → **Attempts**, or run `npx sanity hooks logs`). A `200` means it worked; see [Troubleshooting](#10-troubleshooting) for other codes.

> Without webhook 1, content changes still appear — just within a minute or two instead of instantly. Without webhook 2, clients are **not** emailed when Garry confirms or cancels from the Studio.

---

## 9. Post-launch checklist

Work through this on the live domain:

- [ ] **Studio**: open `https://<domain>/studio`, log in, and check the Site settings (email, phone, address), Booking settings (hours, rules) and service prices are Garry's real ones.
- [ ] **Timezone data**: Vercel → **Logs** shows no `[booking] Timezone data … predates 2026b` line (step 7.2).
- [ ] **Test booking**: book a service at `https://<domain>/book` with your own email, on a date **on or after 1 November 2026**. Note the time you picked.
  - [ ] Garry receives the "new booking" email (`BOOKING_NOTIFICATION_EMAIL`).
  - [ ] The client email arrives with the details and a calendar invite (`.ics`) — check the spam folder too.
  - [ ] Add the `.ics` to a phone calendar (one with current software updates): it must show **exactly the time you booked**. One hour later means the server's timezone data is too old — see [Troubleshooting](#10-troubleshooting); one hour earlier means the phone's is.
  - [ ] The booking appears in the Studio under Bookings.
  - [ ] Picking the same time again shows it as **booked**.
- [ ] **Bookings are private**: in a private/incognito browser window (not logged in to Sanity), open `https://<project-id>.api.sanity.io/v2025-02-19/data/query/production?query=count(*%5B_type%20in%20%5B%22booking%22%2C%22contactMessage%22%5D%5D)`. The result must be `0` even though the test booking exists.
- [ ] **Cancel via the link** in the client email → both cancellation emails arrive and the time becomes free again on `/book`.
- [ ] **Studio status emails**: make another test booking, cancel it in the Studio → the client receives a cancellation email (webhook 2 shows `200`).
- [ ] **Content update**: change a word on the Home page in the Studio, **Publish**, reload the site → the change shows within a few seconds (webhook 1 shows `200`).
- [ ] **Contact form**: send a message → it arrives by email and in the Studio under Messages.
- [ ] **SEO**: `https://<domain>/robots.txt` and `https://<domain>/sitemap.xml` load and use the real domain.
- [ ] **Google Search Console**: <https://search.google.com/search-console> → add the domain property → verify via DNS → **Sitemaps** → submit `sitemap.xml`.
- [ ] **Google Business Profile**: set the website to `https://<domain>` and the **Booking / Appointment link** to `https://<domain>/book`.
- [ ] **Social preview**: paste the URL into a WhatsApp/Instagram/Facebook message (or <https://www.opengraph.xyz>) and check the card shows.
- [ ] Delete the test bookings in the Studio.

> The website accepts only about **three bookings per email address in 24 hours**, and at most **two upcoming appointments** per email address. For more test bookings than that, use another email address.

---

## 10. Troubleshooting

**The Studio shows a CORS error / "origin not allowed" / keeps asking to log in**
The address in the browser is not in the CORS list (step 2), or was added without credentials. Add the exact origin — `https://`, no trailing slash, with or without `www` exactly as you visit it — with `--credentials` (or tick **Allow credentials** in the web UI), then reload.

**The Studio says the project or dataset can't be found**
`NEXT_PUBLIC_SANITY_PROJECT_ID` / `NEXT_PUBLIC_SANITY_DATASET` are missing or wrong in Vercel. Fix them and **Redeploy** (these values are baked in at build time).

**The site shows the default content instead of what's in the Studio**
Check the Vercel environment variables (and redeploy after changing them), that the content was **published** (not just saved as a draft), and that `NEXT_PUBLIC_SANITY_DATASET` names the dataset that holds the content.

**Booking says "temporarily unavailable"**
- `SANITY_API_WRITE_TOKEN` is missing, expired or only has **Viewer** rights — create an **Editor** token (step 3). Also check `BOOKING_TOKEN_SECRET` is set. Vercel → project → **Logs** shows a `[booking]` line naming the missing setting. Redeploy after changing variables.
- Or the site couldn't reach Sanity (a Sanity outage or a revoked token); the logs then show `[booking] Could not load …` lines. Booking pauses itself rather than offering the built-in default services and hours, which might not match Garry's real ones. It starts working again on its own once Sanity is reachable.
- While the write token is missing, the contact form still works, but messages arrive **by email only** — they are not saved under Messages in the Studio.

**A client says the website won't take their booking**
The website accepts about three bookings per email address in 24 hours, and at most two upcoming appointments per email address. Past that, it asks the client to contact Garry, who can change their booking or add one himself in the Studio (Calendar → New booking). Other refusals ("too many requests") clear after a few minutes.

**Calendar invites show appointments an hour off**
The server's timezone data is older than 2026b (see step 7.2). Vercel → **Logs** shows a `[booking] Timezone data … predates 2026b` line. Redeploy so the build picks up the newest Node.js 24 release; if its data is still too old, raise `engines.node` in `package.json` to the newest major version Vercel offers and redeploy. Invites already sent keep the wrong time — check upcoming appointments after 1 November 2026 and tell the affected clients.

**Emails don't arrive, or land in spam**
- In Resend, the domain must show **Verified** and `EMAIL_FROM` must use that domain. The default `onboarding@resend.dev` sender only delivers to your own Resend login email.
- Check Resend → **Emails** / **Logs** for bounces or errors, and Vercel **Logs** for `[email]` lines.
- `RESEND_API_KEY` must be set in Vercel (without it, production sends nothing).
- Add the DMARC record from step 5 and ask recipients to mark the first email "Not spam".

**Content changes take a minute or two to appear**
Webhook 1 isn't working. In its attempts log: `401` → the secret in Sanity doesn't match `SANITY_REVALIDATE_SECRET` in Vercel; `500` → `SANITY_REVALIDATE_SECRET` is not set in Vercel; `404` → wrong URL. Fix, redeploy if you changed Vercel variables, then publish again.

**Clients aren't emailed when Garry confirms/cancels in the Studio**
Check webhook 2 the same way (`SANITY_WEBHOOK_SECRET`). Note: no email is sent for bookings without an email address, for appointments already in the past, or when the client cancelled it themselves (they already got an email).

**Social cards still show the old website**
Facebook/WhatsApp cache previews. Re-scrape with the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) (click **Scrape Again**).

---

## 11. Maintenance

- **Backups** (recommended monthly, and before big changes):
  ```bash
  npx sanity dataset export production production-backup-$(date +%F).tar.gz
  ```
  Store the file somewhere safe — it contains clients' personal information.
- **Rotating a token or secret**: create the new value, update it in Vercel, redeploy, then delete the old token in Sanity (and update the webhook secret if you rotated a webhook secret).
- **Dependency updates**: run `npm outdated`, update, then `npm run lint && npm run typecheck && npm test && npm run build` before deploying.
- **Node.js updates**: when changing the Node.js version (locally or in Vercel), check the timezone data again — `node -p process.versions.tz` locally, and the `[booking] Timezone data` log line after deploying (step 7.2).
- **Bookings added in the Studio before booking durations were filled in automatically** (one-off, for a site that already has bookings): run the backfill once, before changing a service's duration or deleting a service, so those bookings keep their length. It copies the service's duration onto every booking without one and is safe to re-run:
  ```bash
  npx sanity exec scripts/backfill-booking-durations.ts -- --dry-run   # preview
  npx sanity exec scripts/backfill-booking-durations.ts
  ```
