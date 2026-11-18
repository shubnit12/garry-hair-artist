import { MailIcon, PhoneIcon } from "@/components/ui/icons";
import { telHref } from "@/lib/format";

import type { BusinessContact } from "./types";

const linkClass =
  "inline-flex min-h-11 max-w-full items-center gap-2.5 border border-current px-4 py-2 text-sm wrap-anywhere transition-colors hover:bg-current/10";

/** Email / phone fallbacks for when online booking can't complete. */
export function ContactOptions({
  contact,
  className = "",
}: {
  contact: BusinessContact;
  className?: string;
}) {
  return (
    <ul className={`flex flex-col gap-2 sm:flex-row sm:flex-wrap ${className}`}>
      <li>
        <a href={`mailto:${contact.email}`} className={linkClass}>
          <MailIcon size={16} className="shrink-0" />
          <span>
            <span className="sr-only">Email </span>
            {contact.email}
          </span>
        </a>
      </li>
      {contact.phone ? (
        <li>
          <a href={telHref(contact.phone)} className={linkClass}>
            <PhoneIcon size={16} className="shrink-0" />
            <span>
              <span className="sr-only">Call </span>
              {contact.phone}
            </span>
          </a>
        </li>
      ) : null}
    </ul>
  );
}
