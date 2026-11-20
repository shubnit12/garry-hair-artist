import type {
  AboutPage,
  BookingSettings,
  ContactPage,
  GalleryItem,
  HomePage,
  LegalPage,
  Service,
  ServicesPage,
  SiteImage,
  SiteSettings,
  Testimonial,
} from "./types";

/**
 * Built-in content used when Sanity is not configured yet (or a field is left
 * empty). `scripts/seed.ts` writes this same content into Sanity, so the
 * website looks identical before and after connecting the CMS.
 *
 * Prices, hours and contact details are sensible starting values — update the
 * real ones in the Studio at /studio.
 */

export const localImages = {
  portrait: {
    src: "/images/garry-portrait.jpg",
    alt: "Portrait of Garry, hair artist, in a black sweater",
    width: 1600,
    height: 2133,
    focus: { x: 0.45, y: 0.45 },
  },
  silverWaves: {
    src: "/images/work-silver-waves.jpg",
    alt: "Client with long silver-ash balayage and soft waves, styled by Garry",
    width: 1027,
    height: 1836,
    focus: { x: 0.5, y: 0.4 },
  },
  ashBlondeLob: {
    src: "/images/work-ash-blonde-lob.jpg",
    alt: "Client with a textured ash-blonde shoulder-length cut",
    width: 1320,
    height: 2335,
    focus: { x: 0.45, y: 0.4 },
  },
  softBalayage: {
    src: "/images/work-soft-balayage.jpg",
    alt: "Client with soft caramel balayage and loose waves",
    width: 1320,
    height: 2335,
    focus: { x: 0.5, y: 0.45 },
  },
  voluminousBlowout: {
    src: "/images/work-voluminous-blowout.jpg",
    alt: "Client with a voluminous bronde blow-out with face-framing layers",
    width: 1320,
    height: 2335,
    focus: { x: 0.5, y: 0.4 },
  },
} satisfies Record<string, SiteImage>;

export const fallbackSiteSettings: SiteSettings = {
  businessName: "Garry Hair Artist",
  shortName: "Garry",
  tagline: "Hair with intention.",
  description:
    "Garry is an independent hair artist in Surrey, BC offering precision haircuts, dimensional colour, smoothening, treatments and hair spa services. Book your appointment online.",
  announcements: [
    "Now booking in Surrey, BC",
    "Book online — 24/7",
    "Cuts · Colour · Smoothening · Treatments",
    "Have a good hair day",
  ],
  email: "garry@garryhairartist.com",
  phone: undefined,
  address: {
    city: "Surrey",
    region: "BC",
    country: "Canada",
  },
  mapQuery: "Surrey, BC, Canada",
  social: {},
  ogImage: localImages.silverWaves,
};

export const fallbackServices: Service[] = [
  {
    id: "service-haircut",
    name: "Haircut",
    slug: "haircut",
    category: "cut",
    summary: "A tailored cut built around face shape, texture and lifestyle.",
    description:
      "Every cut starts with a conversation about how you wear your hair day to day. Includes a wash, precision cut and a finished style, plus advice on how to recreate it at home.",
    durationMinutes: 60,
    price: 90,
    priceFrom: true,
    featured: true,
    bookable: true,
    order: 10,
    image: localImages.ashBlondeLob,
  },
  {
    id: "service-hairstyle",
    name: "Hairstyle",
    slug: "hairstyle",
    category: "cut",
    summary: "Blow-dry, waves or an event-ready finish.",
    description:
      "From a polished blow-out to soft waves or an occasion style, shaped to last and photograph beautifully. Ideal before events, shoots or a night out.",
    durationMinutes: 60,
    price: 70,
    priceFrom: true,
    featured: false,
    bookable: true,
    order: 20,
    image: localImages.voluminousBlowout,
  },
  {
    id: "service-coloring",
    name: "Coloring",
    slug: "coloring",
    category: "colour",
    summary: "Dimensional colour, balayage and highlights with a soft grow-out.",
    description:
      "Personalised colour with thoughtful placement — from lived-in balayage to bright, dimensional blonde. Includes tone, gloss and finish. Prices vary with length and density; a consultation is recommended for big changes.",
    durationMinutes: 150,
    price: 180,
    priceFrom: true,
    featured: true,
    bookable: true,
    order: 30,
    image: localImages.silverWaves,
  },
  {
    id: "service-smoothening",
    name: "Smoothening",
    slug: "smoothening",
    category: "treatment",
    summary: "Frizz-free, glossy hair that stays manageable for months.",
    description:
      "A smoothing treatment that softens frizz, adds shine and cuts down styling time while keeping natural movement. Includes aftercare guidance so results last.",
    durationMinutes: 180,
    price: 250,
    priceFrom: true,
    featured: true,
    bookable: true,
    order: 40,
    image: localImages.softBalayage,
  },
  {
    id: "service-treatments",
    name: "Treatments",
    slug: "treatments",
    category: "treatment",
    summary: "Bond-repair and deep-conditioning rituals for stressed hair.",
    description:
      "Targeted treatments to rebuild strength, restore moisture and bring life back to coloured or heat-styled hair. Recommended alongside colour services.",
    durationMinutes: 60,
    price: 80,
    priceFrom: true,
    featured: false,
    bookable: true,
    order: 50,
  },
  {
    id: "service-hair-spa",
    name: "Hair Spa",
    slug: "hair-spa",
    category: "care",
    summary: "A restorative ritual for scalp and lengths.",
    description:
      "Cleanse, mask, steam and massage — a slow, restorative service that nourishes the scalp and leaves hair soft, shiny and healthy.",
    durationMinutes: 60,
    price: 85,
    priceFrom: true,
    featured: false,
    bookable: true,
    order: 60,
  },
  {
    id: "service-headwash",
    name: "Headwash",
    slug: "headwash",
    category: "care",
    summary: "A thorough wash and condition with a quick finish.",
    description:
      "A professional wash and condition using products suited to your hair, finished with a simple blow-dry.",
    durationMinutes: 30,
    price: 30,
    priceFrom: false,
    featured: false,
    bookable: true,
    order: 70,
  },
  {
    id: "service-head-massage",
    name: "Head Massage",
    slug: "head-massage",
    category: "care",
    summary: "Release tension and stimulate the scalp.",
    description:
      "A relaxing scalp and head massage to release tension, improve circulation and reset — on its own or added to any service.",
    durationMinutes: 30,
    price: 40,
    priceFrom: false,
    featured: false,
    bookable: true,
    order: 80,
  },
  {
    id: "service-root-touchup",
    name: "Root Touch-up",
    slug: "root-touchup",
    category: "colour",
    summary: "Refresh regrowth and keep your colour seamless.",
    description:
      "Colour applied to the regrowth only, matched to your existing shade for a seamless result. Includes a gloss to refresh the ends where needed.",
    durationMinutes: 90,
    price: 110,
    priceFrom: true,
    featured: false,
    bookable: true,
    order: 90,
  },
  {
    id: "service-consultation",
    name: "Consultation",
    slug: "consultation",
    category: "consultation",
    summary: "Talk through your goals, history and the best plan forward.",
    description:
      "Not sure where to start? We'll look at your hair, talk through your inspiration and maintenance, and map out the right services and budget. Strand tests can be arranged for colour.",
    durationMinutes: 30,
    priceFrom: false,
    priceNote: "Complimentary",
    featured: false,
    bookable: true,
    order: 100,
  },
  {
    id: "service-toning",
    name: "Toning",
    slug: "toning",
    category: "colour",
    summary: "Neutralise brassiness and refine your blonde.",
    description:
      "A gloss or toner to correct unwanted warmth, refresh shine and fine-tune your shade between colour appointments.",
    durationMinutes: 60,
    price: 75,
    priceFrom: true,
    featured: false,
    bookable: true,
    order: 110,
  },
  {
    id: "service-simple-trim",
    name: "Simple Trim",
    slug: "simple-trim",
    category: "cut",
    summary: "Clean up ends and keep your shape fresh.",
    description:
      "A quick maintenance trim to remove split ends and keep your current shape looking sharp. Dry finish.",
    durationMinutes: 30,
    price: 45,
    priceFrom: false,
    featured: false,
    bookable: true,
    order: 120,
  },
];

export const fallbackGallery: GalleryItem[] = [
  {
    id: "gallery-quiet-dimension",
    title: "Quiet Dimension",
    caption: "Dimensional colour · Gloss",
    image: localImages.silverWaves,
  },
  {
    id: "gallery-soft-structure",
    title: "Soft Structure",
    caption: "Lived-in balayage · Natural movement",
    image: localImages.softBalayage,
  },
  {
    id: "gallery-modern-classic",
    title: "Modern Classic",
    caption: "Restyle · Volume finish",
    image: localImages.voluminousBlowout,
  },
  {
    id: "gallery-ash-melt",
    title: "Ash Melt",
    caption: "Toned blonde · Textured lob",
    image: localImages.ashBlondeLob,
  },
];

/**
 * Intentionally empty: testimonials must be real client reviews, added in the
 * Studio. The testimonials section hides itself until at least one exists.
 */
export const fallbackTestimonials: Testimonial[] = [];

export const fallbackHomePage: HomePage = {
  seo: {},
  heroHeading: "Hair with intention",
  heroText:
    "Garry Hair Artist. Precision cuts, dimensional colour and restorative care in Surrey, BC — because how you show up changes everything.",
  heroCtaLabel: "Book Your Appointment",
  heroImages: [localImages.ashBlondeLob, localImages.silverWaves],
  heroScript: "Garry",
  servicesHeading: "Signature Services",
  servicesIntro: "A little care. A lot of character.",
  galleryHeading: "The Art of the Craft",
  galleryIntro:
    "A portfolio of recent work and a testament to sharp attention to detail.",
  aboutHeading: "Meet Garry",
  aboutText:
    "Hair should feel like you — only more considered. Every appointment begins with listening, then brings together thoughtful technique, individual style and a finish that works in real life.\n\nFrom precise cuts to dimensional colour, the goal is always the same: hair that feels effortless, looks intentional and grows with you.",
  aboutImage: localImages.portrait,
  testimonialsHeading: "What Clients Say",
  ctaHeading: "Your Chair Awaits",
  ctaText:
    "Pick a service, choose a time that suits you and you're booked — instant confirmation by email.",
};

export const fallbackAboutPage: AboutPage = {
  seo: {
    title: "About Garry",
    description:
      "Meet Garry — an independent hair artist in Surrey, BC with a personal, consultation-led approach to cuts, colour and care.",
  },
  eyebrow: "About · The person behind the work",
  heading: "Good Hair. Good Energy.",
  intro:
    "A personal approach to hair artistry — built on listening, thoughtful technique and the belief that your hair should feel unmistakably yours.",
  portrait: localImages.portrait,
  story:
    "Great hair is never just about following a trend. It is about understanding texture, proportions, lifestyle and the small details that make a look feel natural on one person and extraordinary on another.\n\nAt Garry Hair Artist, the process is collaborative: we talk through what you love, what you want to change and how you want your hair to feel when you leave the chair.\n\nThe result is a personal look with intention — beautiful in the chair, practical at home and made to feel like you.",
  philosophyHeading: "Less Formula. More Feeling.",
  philosophyText:
    "Good work needs room to think. The experience is relaxed, collaborative and focused on details — from the first conversation to the final finish. There are no one-size-fits-all results. Just careful work, open communication and an approach built around you.",
  values: [
    { title: "Consultation", text: "Time to understand what you want — and what your hair needs." },
    { title: "Craft", text: "Technique with purpose and precision, from first section to final finish." },
    { title: "Care", text: "Honest advice and aftercare you can actually use after your visit." },
  ],
};

export const fallbackServicesPage: ServicesPage = {
  seo: {
    title: "Services & Prices",
    description:
      "Haircuts, styling, colouring, smoothening, treatments, hair spa, head massage and more by Garry in Surrey, BC. View durations and prices and book online.",
  },
  eyebrow: "Services · The menu",
  heading: "Our Services",
  intro:
    "Every service is shaped around your hair, your routine and the result you want. Choose a service to see availability and book instantly.",
  note:
    "Prices are starting points and vary with hair length, density and the time your look needs. For major colour changes, book a complimentary consultation first.",
};

export const fallbackContactPage: ContactPage = {
  seo: {
    title: "Contact",
    description:
      "Get in touch with Garry Hair Artist in Surrey, BC. Ask a question, share your inspiration or book an appointment online.",
  },
  eyebrow: "Contact · By appointment",
  heading: "Let's Talk Hair",
  intro:
    "Tell me a little about what you have in mind — share your inspiration, your current hair and the result you're hoping for.",
  formHeading: "Send a Note",
  formIntro:
    "Questions about a service, pricing or a big transformation? Send a message and I'll get back to you personally. To lock in a time, book online.",
};

export const fallbackPrivacyPage: LegalPage = {
  seo: {
    title: "Privacy Policy",
    description: "How Garry Hair Artist collects, uses and protects your personal information.",
  },
  heading: "Privacy Policy",
  updatedAt: "2026-10-31",
  body: [
    "This policy explains how Garry Hair Artist (\"we\", \"us\") collects, uses and protects personal information when you visit this website, book an appointment or contact us. We follow British Columbia's Personal Information Protection Act (PIPA).",
    "## Information we collect",
    "When you book or send a message we collect the details you provide: your name, email address, phone number, the service and time you choose, and any notes you add. We do not collect payment information on this website.",
    "## How we use it",
    "We use your information only to schedule and manage your appointment, send confirmations and reminders, respond to your enquiries and keep basic service records. We never sell your information.",
    "## Service providers",
    "Bookings and messages are stored securely with our content platform (Sanity) and confirmation emails are delivered by our email provider (Resend). These providers process data on our behalf and may store it outside Canada.",
    "## Retention",
    "We keep booking records only as long as needed to provide our services and meet legal obligations, after which they are deleted.",
    "## Your choices",
    "You can ask to see, correct or delete the personal information we hold about you at any time by emailing us. You can cancel an appointment using the link in your confirmation email.",
    "## Contact",
    "Questions about privacy? Email us and we'll respond within 30 days.",
  ].join("\n\n"),
};

export const fallbackBookingSettings: BookingSettings = {
  slotIntervalMinutes: 30,
  bufferMinutes: 15,
  minNoticeMinutes: 120,
  maxAdvanceDays: 60,
  weeklyHours: [
    { day: "monday", closed: true, open: "10:00", close: "19:00" },
    { day: "tuesday", closed: false, open: "10:00", close: "19:00" },
    { day: "wednesday", closed: false, open: "10:00", close: "19:00" },
    { day: "thursday", closed: false, open: "10:00", close: "19:00" },
    { day: "friday", closed: false, open: "10:00", close: "19:00" },
    { day: "saturday", closed: false, open: "09:00", close: "18:00" },
    { day: "sunday", closed: false, open: "11:00", close: "17:00" },
  ],
  autoConfirm: true,
  notificationEmails: [],
  cancellationPolicy:
    "Need to change plans? Please cancel at least 24 hours before your appointment using the link in your confirmation email so the time can be offered to another client.",
  confirmationMessage:
    "A confirmation with all the details has been sent to your email. See you in the chair.",
};
