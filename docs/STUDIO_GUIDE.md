# Studio guide for Garry

Your website has a private back office called the **Studio**. It's where you see your bookings, block time off and change anything on the site — text, services, prices, photos and opening hours. No code needed.

**Open it:** go to **`yourdomain.com/studio`** (for example `garryhairartist.com/studio`) and log in with the Sanity account you were invited with. It works on a phone, but a laptop or tablet is more comfortable.

> **Bookmark it** — and on your phone use "Add to Home Screen" so it opens like an app.

---

## Quick answers

| I want to… | Go to |
|---|---|
| See today's appointments | **Bookings → Today** |
| See the week at a glance | **Calendar** (top bar) |
| Confirm a booking request | **Bookings → Pending confirmation** → open it → **Confirm booking** |
| Cancel an appointment | Open the booking → **Cancel booking** |
| Add a phone or walk-in booking | **Calendar → New booking**, or **Bookings → New booking** |
| Help a client who can't book online | See [When a client can't book online](#when-a-client-cant-book-online) |
| Take a day or a holiday off | **Time off → +** |
| Change opening hours | **Settings → Booking settings → Hours** |
| Change a price | **Services** → the service → **Pricing & time** → **Publish** |
| Add photos of your work | **Portfolio → +** |
| Add a client review | **Testimonials → +** (real reviews only) |
| Read website messages | **Messages → New** |
| Change your phone, email or address | **Settings → Site settings → Contact & location** |

---

## Two kinds of saving

- **Bookings, Time off and Messages save instantly.** As soon as you change something, it's live — there's no Publish button to remember.
- **Everything else (pages, services, photos, settings) needs Publish.** Your edits are a private draft until you press the green **Publish** button at the bottom. Then the website updates within a few seconds.

Made a mistake? Open the **⋯** menu next to Publish → **Discard changes** (before publishing), or use **History** (clock icon at the top right of a document) to restore an earlier version.

---

## Bookings

### Where they appear

Click **Bookings** in the left-hand menu:

| List | Shows |
|---|---|
| **Today** | Every booking for today, earliest first |
| **Upcoming** | Pending and confirmed bookings from today onwards |
| **Pending confirmation** | Requests waiting for you to confirm |
| **Past** | Earlier appointments, newest first |
| **Cancelled** | Cancelled appointments |
| **All bookings** | Everything |

Each booking shows the date, time, client name, service and status. Open one to see the client's email, phone and notes. The **Private notes** box is only ever visible to you — use it for colour formulas, allergies or preferences.

You'll also get an **email** for every new booking, with the client's details and a calendar invite you can add to your phone's calendar.

### The Calendar

Click **Calendar** in the top bar for a week view of all bookings and time off.

- **‹ / ›** move a week back or forward; **This week** jumps back to today.
- Click a booking (or a time-off block) to open it.
- **New booking** adds an appointment.
- **Show cancelled** reveals cancelled bookings, which are hidden by default.

### Booking statuses

| Status | Meaning | Holds the time slot? |
|---|---|---|
| **Pending** | Requested, waiting for you to confirm | Yes |
| **Confirmed** | Booked | Yes |
| **Completed** | The appointment happened | No |
| **No-show** | The client didn't come | No |
| **Cancelled** | Cancelled by you or the client | No — the time is free again |

While a booking is pending or confirmed, nobody else can book that time — the website shows it as **booked**.

### Confirming a booking

New website bookings are confirmed automatically, unless you turned that off (see [Booking rules](#booking-rules)). In that case they arrive as **Pending**:

1. Open **Bookings → Pending confirmation** and click the booking.
2. Press **Confirm booking** at the bottom.

The client is **emailed automatically** that their appointment is confirmed.

### Cancelling a booking

1. Open the booking.
2. Press **Cancel booking** at the bottom and confirm.

The time becomes free again on the website and the client is **emailed automatically** that the appointment was cancelled (as long as the booking has an email address and is still in the future). Clients can also cancel themselves using the link in their confirmation email — you'll get an email when they do.

After an appointment, you can press **Mark completed** or **Mark no-show** to keep your records tidy. No email is sent for these.

### Adding a phone or walk-in booking

1. **Calendar → New booking** (or **Bookings → New booking**). Always add bookings this way: it keeps the client's details private. Booking lists have no **+** button and bookings can't be duplicated, on purpose.
2. Pick the **service**, **date** and **start time**, and enter the client's **name** (email and phone are optional but useful).
3. **Duration (minutes)** fills in by itself from the service you picked. Change it if this appointment needs more or less time — the Studio shows a reminder when it differs from the service's usual length.
4. Leave the status as **Confirmed**.

It's saved immediately and blocks that time on the website. The Studio warns you if it overlaps another booking or falls outside your hours — you can still save it if you mean to.

> **No email is sent** for bookings you add yourself — let the client know the details directly. If you later cancel it and it has an email address, the client does get the cancellation email.

### When a client can't book online

To keep out spam and fake bookings, the website has a few limits:

- **About three bookings per email address in 24 hours.**
- **At most two upcoming appointments** per email address.
- **No online changes.** Clients can cancel with the link in their email, but to move or change an appointment they contact you.

When a client hits a limit, the website asks them to get in touch. You can always add or change their booking yourself here in the Studio — these limits only apply to the website.

If the booking page says online booking is **"temporarily unavailable"**, the website couldn't reach your Studio data for a moment. It pauses booking rather than risk offering the wrong times or services, and starts again by itself. If it lasts more than an hour, tell your web developer.

---

## Time off and holidays

Use **Time off** whenever you're not available — holidays, a dentist appointment, a long lunch.

1. **Time off → +** (the plus button).
2. **From** — the first day. **Until** — the last day (leave empty for a single day).
3. Keep **All day** on to block whole days, or turn it off and choose **From time** / **Until time** to block part of each day.
4. **Reason** is optional and never shown on the website. Keep it general (e.g. "Holiday"): unlike bookings, time off isn't stored privately.

It's saved instantly and clients can no longer book those times. Existing bookings in that period are **not** cancelled — check the Calendar and cancel any you need to move.

To remove time off, open the entry → **⋯** → **Delete**.

---

## Hours and booking rules

**Settings → Booking settings**

### Opening hours

Under **Hours**, there's one row per weekday. Set **Opens** and **Closes**, or tick **Closed all day**. Clients can only book inside these hours, and the hours in the website footer update too. A missing day counts as closed. Press **Publish** when done.

### Booking rules

Under **Booking rules**:

| Setting | What it does |
|---|---|
| **Start-time interval** | How often start times are offered: every 15 min, 30 min or hour |
| **Buffer after each appointment** | Clean-up time kept free after every booking |
| **Minimum notice** | How soon a client can book, e.g. "2 hours" stops last-minute bookings |
| **Booking window (days)** | How far ahead clients can book |
| **Confirm bookings automatically** | **On**: bookings are confirmed instantly. **Off**: they arrive as *Pending* for you to confirm |

### Messages & notifications

- **Notification emails** — extra addresses that receive new-booking, cancellation and contact-form emails. Anyone can look these up through Sanity, so only add addresses you're happy to be public (like your business email).
- **Confirmation message** — the thank-you text clients see after booking.
- **Cancellation policy** — shown on the booking page and in emails.

---

## Services and prices

**Services** lists everything on your menu, in the order shown on the website.

Open a service to edit it:

- **Details** — name, category, a one-line **summary** (for cards) and a **full description** (for the Services page).
- **Pricing & time**
  - **Duration (minutes)** — how much time a booking blocks in your calendar. A change applies to new bookings; existing ones keep the length they were booked with.
  - **Price (CAD)** — leave empty to show the **Price note** instead (e.g. "Complimentary" or "By consultation").
  - **Starting price** — on: shows "From $90"; off: shows "$90".
- **Display**
  - **Image** (optional) and its alt text.
  - **Feature on home page** — the home page shows up to three featured services.
  - **Bookable online** — turn off to show a service without letting clients book it online.
  - **Sort order** — lower numbers appear first.

Press **Publish**. To add a service, click **+** in the Services list. Avoid changing a service's **URL slug** once the site is live — links that use it would stop working.

> The prices and durations that came with the website are **starting placeholders** — please check every service before launch.

---

## Portfolio photos

**Portfolio** holds the photos in "The Art of the Craft" on the home page (the first few also appear on the About page).

1. **Portfolio → +**.
2. Add a short **Title** (e.g. "Soft Balayage") and an optional **Caption** (e.g. "Lived-in balayage · Gloss").
3. Upload the **Image**. Tall portrait photos look best.
4. Fill in **Alt text** — one sentence describing the photo for people using screen readers and for Google, e.g. "Client with soft caramel balayage and loose waves".
5. Optional: drag the circle in the image editor (the crop/hotspot tool) onto the most important part of the photo, so it's never cropped out.
6. **Publish**.

Use **Sort order** to change the order (lower first). To remove a photo: open it → **⋯** → **Delete**.

> Only use photos you took or have permission to use, and ask clients before posting their photos.

---

## Testimonials (client reviews)

The "What Clients Say" section on the home page appears **only once at least one testimonial exists** — so it's hidden until you add some. (You can change its heading under **Home page → Sections → Testimonials heading**.)

**Please add real reviews only**, word for word — for example from your Google reviews or a message a client sent you, with their permission. Never write or edit reviews yourself.

1. **Testimonials → +**.
2. Paste the **Quote**, the **Client name** (first name + initial is fine, e.g. "Priya S."), and optionally the **Service** and **Rating**.
3. **Show on website** — turn off to hide a review without deleting it.
4. **Publish**.

---

## Page text and photos

Each page has its own document in the menu: **Home page**, **About page**, **Services page**, **Contact page** and **Privacy policy**. Inside, fields are grouped in tabs (e.g. **Hero**, **Sections**, **SEO**). Edit the text and press **Publish**.

- **Paragraphs:** in long text boxes, leave a blank line between paragraphs.
- **Hero images (Home page):** exactly two photos — a narrow one (left) and a wide one (right). Portrait photos work best.
- **Privacy policy:** start a line with `## ` to make it a heading.
- **SEO tab:** the title and short description Google shows for that page. Optional — sensible defaults are used when empty. On every page except Home, your business name is added to the end of the title automatically, so there's no need to type it.

### Site settings

**Settings → Site settings** controls things used on every page:

- **Brand** — business name, tagline, the default Google description, the **Announcement bar** (the scrolling messages at the very top) and the **Social share image** (the picture shown when someone shares your link; 1200×630 works best).
- **Contact & location** — public email, phone, street address and the **Map location** used for the map and "Get directions". Leave the street empty to show only the city.
- **Social** — full links to your Instagram, Facebook, TikTok or YouTube (starting with `https://`). Empty ones are hidden.

### What if I leave a field empty?

Nothing breaks. Every text field on the pages and settings has a built-in default, and the website shows that default until you write your own. Clearing a field brings the default back.

---

## Messages

When someone uses the contact form, you get an **email** and the message is saved under **Messages → New**.

Reply by email as usual, then set the message's status to **Replied** (or **Archived**) so the New list stays short. Messages save instantly.

---

## Good to know

- **Changes appear in seconds.** After you press Publish the website updates almost immediately. If something still looks old, wait a minute and refresh the page.
- **Times are Surrey time** (Pacific Time) everywhere — in the Studio, on the website and in emails.
- **Privacy.** Bookings and messages contain clients' personal details. Don't share screenshots of them, and delete old test bookings.
- **Need help?** If something looks wrong on the website, note the page address and what you changed last, and send it to your web developer.
