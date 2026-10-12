import type { SVGProps } from 'react';

/** One stroke icon set, 24px grid, 2px stroke. Decorative unless given a `title`. */
const PATHS = {
  search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></>,
  globe: <><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c2.5 3 2.5 15 0 18M12 3c-2.5 3-2.5 15 0 18" /></>,
  user: <><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></>,
  home: <path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z" />,
  calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></>,
  file: <><path d="M6 3h9l4 4v14H6z" /><path d="M14 3v5h5M12 11v6M9 14h6" /></>,
  back: <path d="m15 6-6 6 6 6" />,
  chevron: <path d="m9 6 6 6-6 6" />,
  phone: <path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z" />,
  pin: <><path d="M12 21s-7-6.2-7-11a7 7 0 0 1 14 0c0 4.8-7 11-7 11z" /><circle cx="12" cy="10" r="2.5" /></>,
  hospital: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 7v6M9 10h6M9 21v-4h6v4" /></>,
  building: <><rect x="4" y="3" width="16" height="18" rx="2" /><path d="M12 7v6M9 10h6" /></>,
  check: <path d="m5 12 5 5 9-10" />,
  info: <><circle cx="12" cy="12" r="9" /><path d="M12 7v6M12 16.5v.5" /></>,
  alert: <><path d="M12 3 2 20h20z" /><path d="M12 10v4M12 17v.5" /></>,
  plus: <path d="M12 5v14M5 12h14" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  lock: <><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></>,
  copy: <><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" /></>,
  mail: <><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></>,
  clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
  grid: <><rect x="4" y="4" width="6" height="6" rx="1.5" /><rect x="14" y="4" width="6" height="6" rx="1.5" /><rect x="4" y="14" width="6" height="6" rx="1.5" /><rect x="14" y="14" width="6" height="6" rx="1.5" /></>,
  settings: <><circle cx="12" cy="12" r="3" /><path d="M12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1" /></>,
  eye: <><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z" /><circle cx="12" cy="12" r="3" /></>,
  eyeOff: <><path d="M3 3l18 18M10.6 6.1A10 10 0 0 1 12 6c6 0 10 6 10 6a17 17 0 0 1-3.2 3.7M6.6 6.6C3.8 8.4 2 12 2 12s4 7 10 7a9.6 9.6 0 0 0 4.4-1" /><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" /></>,
  tooth: <path d="M7 3c-2.5 0-4 2-4 4.5 0 3 1.5 4.5 2 7 .5 3 1 6.5 2.5 6.5S9.5 17 12 17s3 4 4.5 4 2-3.5 2.5-6.5c.5-2.5 2-4 2-7C21 5 19.5 3 17 3c-2 0-3 1-5 1S9 3 7 3z" />,
  female: <><circle cx="12" cy="9" r="5" /><path d="M12 14v7M9 18h6" /></>,
  brain: <><path d="M12 4a4 4 0 0 0-4 3 4 4 0 0 0-3 6.5A4 4 0 0 0 8 20a3 3 0 0 0 4 0 3 3 0 0 0 4 0 4 4 0 0 0 3-6.5A4 4 0 0 0 16 7a4 4 0 0 0-4-3z" /><path d="M12 4v16" /></>,
  ear: <><path d="M6 9a6 6 0 1 1 12 0c0 3-2 4-3 5.5S14 18 12 20a3 3 0 0 1-5-1" /><path d="M9.5 9.5a2.5 2.5 0 1 1 5 0c0 1.5-1.5 2-1.5 3" /></>,
  heart: <path d="M12 20s-8-4.5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20z" />,
  pulse: <><path d="M12 20s-8-4.5-8-10.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20z" /><path d="M3 12h5l2-3 3 6 2-3h6" /></>,
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  hand: <path d="M7 11V5a1.5 1.5 0 0 1 3 0v5M10 10V4a1.5 1.5 0 0 1 3 0v6M13 10V5a1.5 1.5 0 0 1 3 0v6M16 11V8a1.5 1.5 0 0 1 3 0v6a7 7 0 0 1-7 7h-1a6 6 0 0 1-5-3l-2.5-4a1.5 1.5 0 0 1 2.5-1.7L7 14" />,
  scalpel: <><path d="M3 21 15 9l3 3-9 6z" /><path d="m15 9 4-4a2 2 0 0 1 3 3l-4 4" /></>,
  drop: <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z" />,
  kidney: <><path d="M9 4C5 4 4 8 4 11s1 9 5 9c3 0 3-3 2-5s-1-4 0-5 1-6-2-6z" /><path d="M15 4c4 0 5 4 5 7s-1 9-5 9" /></>,
  stomach: <path d="M9 3v5c0 2-4 2-4 7a6 6 0 0 0 11 3c1-2 3-2 3-5 0-4-4-5-6-3s-2-1-2-3V3" />,
  scan: <><path d="M4 8V5a1 1 0 0 1 1-1h3M16 4h3a1 1 0 0 1 1 1v3M20 16v3a1 1 0 0 1-1 1h-3M8 20H5a1 1 0 0 1-1-1v-3" /><circle cx="12" cy="12" r="3" /></>,
  briefcase: <><rect x="3" y="7" width="18" height="13" rx="2" /><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M3 13h18" /></>,
  steth: <><path d="M6 3v6a5 5 0 0 0 10 0V3" /><path d="M11 14v2a4 4 0 0 0 8 0v-2" /><circle cx="19" cy="12" r="2" /></>,
  pill: <><rect x="3" y="8" width="18" height="8" rx="4" transform="rotate(-45 12 12)" /><path d="m9.2 9.2 5.6 5.6" /></>,
  upload: <><path d="M12 16V4M7 9l5-5 5 5" /><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3" /></>,
  trash: <><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></>,
  logout: <><path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3" /><path d="M10 17l-5-5 5-5M5 12h11" /></>,
  text: <><path d="M4 7V5h10v2M9 5v14M7 19h4" /><path d="M14 12v-1h6v1M17 11v8M15.5 19h3" /></>,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, title, ...rest }: { name: IconName; title?: string } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden={title ? undefined : true}
      role={title ? 'img' : undefined}
      aria-label={title}
      focusable="false"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

export function Logo({ inverted = false }: { inverted?: boolean }) {
  const tile = inverted ? '#ffffff' : '#0B7285';
  const star = inverted ? '#0B7285' : '#ffffff';
  return (
    <svg viewBox="0 0 40 40" aria-hidden="true" focusable="false">
      <rect width="40" height="40" rx="11" fill={tile} />
      <g fill={star}>
        <rect x="11" y="11" width="18" height="18" rx="2" />
        <rect x="11" y="11" width="18" height="18" rx="2" transform="rotate(45 20 20)" />
      </g>
      <path d="M20 15v10M15 20h10" stroke={tile} strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

export const specialtyIcon: Record<string, IconName> = {
  eyes: 'eye',
  optometry: 'eye',
  obgyn: 'female',
  dental: 'tooth',
  ortho: 'tooth',
  neuro: 'brain',
  ent: 'ear',
  psych: 'chat',
  cardio: 'heart',
  derm: 'hand',
  surgery: 'scalpel',
  urology: 'kidney',
  gastro: 'stomach',
  radiology: 'scan',
  hemonc: 'drop',
  occup: 'briefcase',
  general: 'steth',
};
