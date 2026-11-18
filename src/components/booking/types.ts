import type { Service } from "@/lib/content/types";

/** The subset of a service the booking UI needs (keeps the client payload small). */
export type WizardService = Pick<
  Service,
  "slug" | "name" | "category" | "summary" | "durationMinutes" | "price" | "priceFrom" | "priceNote"
>;

/** Business contact details offered when online booking can't help. */
export type BusinessContact = { email: string; phone?: string };

export type WizardStep = 1 | 2 | 3 | 4;

export type DetailsValues = {
  name: string;
  email: string;
  phone: string;
  notes: string;
  consent: boolean;
};

export type DetailsField = keyof DetailsValues;

export type WizardNotice = { tone: "warning" | "error"; message: string };
