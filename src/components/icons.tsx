import type { SVGProps } from "react";

export type IconProps = SVGProps<SVGSVGElement>;

const stroked = {
  xmlns: "http://www.w3.org/2000/svg",
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  className: "h-4 w-4",
  "aria-hidden": true,
};

export function ToothIcon(props: IconProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4" aria-hidden {...props}>
      <path d="M12 5.5C10.7 4.2 9 3.4 7.3 3.8 5.2 4.3 4.4 6 4.6 8c.2 2.1 1.1 3.8 1.7 5.9.5 1.8.8 4.2 2.2 4.2 1.3 0 1.1-2.3 1.5-3.7.3-1.1.9-1.8 2-1.8s1.7.7 2 1.8c.4 1.4.2 3.7 1.5 3.7 1.4 0 1.7-2.4 2.2-4.2.6-2.1 1.5-3.8 1.7-5.9.2-2-.6-3.7-2.7-4.2-1.7-.4-3.4.4-4.7 1.7z" />
    </svg>
  );
}

export function DashboardIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}

export function UsersIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

export function UserIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}

export function CalendarIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <path d="M8 2v4" />
      <path d="M16 2v4" />
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path d="M3 10h18" />
    </svg>
  );
}

export function ClipboardIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <rect width="8" height="4" x="8" y="2" rx="1" />
      <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
      <path d="M12 11h4" />
      <path d="M12 16h4" />
      <path d="M8 11h.01" />
      <path d="M8 16h.01" />
    </svg>
  );
}

export function ClockIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function DatabaseIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14a9 3 0 0 0 18 0V5" />
      <path d="M3 12a9 3 0 0 0 18 0" />
    </svg>
  );
}

export function CopyIcon(props: IconProps) {
  return (
    <svg {...stroked} {...props}>
      <rect width="14" height="14" x="8" y="8" rx="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}
