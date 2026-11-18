import type { SVGProps } from "react";

/** Minimal stroke icons (1.5px, currentColor) matching the mono aesthetic. */

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 16, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const ChevronRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m9 6 6 6-6 6" /></svg>
);
export const ChevronLeftIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m15 6-6 6 6 6" /></svg>
);
export const ArrowUpRightIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M7 17 17 7M8 7h9v9" /></svg>
);
export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M4 7h16M4 12h16M4 17h16" /></svg>
);
export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M6 6l12 12M18 6 6 18" /></svg>
);
export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
);
export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="5" width="17" height="15.5" rx="1" /><path d="M3.5 10h17M8 3v4M16 3v4" /></svg>
);
export const MapPinIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M12 21s7-6.2 7-11.5A7 7 0 0 0 5 9.5C5 14.8 12 21 12 21Z" /><circle cx="12" cy="9.5" r="2.5" /></svg>
);
export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3" y="5" width="18" height="14" rx="1" /><path d="m3.5 6 8.5 7 8.5-7" /></svg>
);
export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z" /></svg>
);
export const PauseIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M9 5.5v13M15 5.5v13" /></svg>
);
export const PlayIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="M7.5 5.5v13L18.5 12Z" /></svg>
);
export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}><path d="m5 12.5 4.5 4.5L19 7.5" /></svg>
);
export const InstagramIcon = (p: IconProps) => (
  <svg {...base(p)}><rect x="3.5" y="3.5" width="17" height="17" rx="4.5" /><circle cx="12" cy="12" r="4" /><circle cx="17.25" cy="6.75" r=".75" fill="currentColor" /></svg>
);
export const FleurIcon = (p: IconProps) => (
  <svg {...base({ ...p, strokeWidth: 1.25 })}>
    <path d="M12 3c-1.8 2-2.4 4.2-1 6.5.6 1 .9 2 1 3 .1-1 .4-2 1-3 1.4-2.3.8-4.5-1-6.5Z" />
    <path d="M12 12.5c-1.5-2.5-4.5-3.5-6.5-2-1.6 1.2-1 3.6 1 3.8 1.6.1 2.4-.9 2.2-2" />
    <path d="M12 12.5c1.5-2.5 4.5-3.5 6.5-2 1.6 1.2 1 3.6-1 3.8-1.6.1-2.4-.9-2.2-2" />
    <path d="M8 15.5h8M12 12.5V21M10 21h4" />
  </svg>
);
