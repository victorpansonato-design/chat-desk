import type { SVGProps } from 'react';

const paths = {
  menu: 'M4 7h16M4 12h11M4 17h16',
  compose: 'M12 20h8M16.5 3.6a2.1 2.1 0 013 3L8 18.1 4 19l.9-4L16.5 3.6z',
  plus: 'M12 5v14M5 12h14',
  close: 'M6 6l12 12M18 6L6 18',
  expand: 'M15 4h5v5M9 20H4v-5M20 4l-6 6M4 20l6-6',
  collapse: 'M20 9h-5V4M4 15h5v5M15 9l5-5M9 15l-5 5',
  arrowUp: 'M12 19V5M6 11l6-6 6 6',
  arrowDown: 'M12 5v14M6 13l6 6 6-6',
  attach: 'M20.5 11.6l-8.3 8.3a5.4 5.4 0 01-7.6-7.6l8.5-8.5a3.6 3.6 0 015.1 5.1l-8.5 8.5a1.8 1.8 0 01-2.6-2.6l7.8-7.7',
  mic: 'M12 3a3 3 0 00-3 3v6a3 3 0 006 0V6a3 3 0 00-3-3zM5.5 11.5a6.5 6.5 0 0013 0M12 18v3',
  stop: 'M7.5 7.5h9v9h-9z',
  play: 'M8.5 5.5v13l10-6.5z',
  pause: 'M8 5.5v13M16 5.5v13',
  trash: 'M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3',
  chevronLeft: 'M15 5l-7 7 7 7',
  chevronRight: 'M9 5l7 7-7 7',
  headset: 'M4 14.5v-2.5a8 8 0 0116 0v2.5M4 14.5a2 2 0 002 2h1.2v-5H6a2 2 0 00-2 2zM20 14.5a2 2 0 01-2 2h-1.2v-5H18a2 2 0 012 2zM18 16.5v1a3 3 0 01-3 3h-2.5',
  check: 'M5 12.5l4.5 4.5L19 7.5',
  clock: 'M12 7v5l3 2M12 21a9 9 0 110-18 9 9 0 010 18z',
  alert: 'M12 8.5v4.5M12 16.5v.3M12 3.5l9.2 16.5H2.8L12 3.5z',
  refresh: 'M20 11a8 8 0 10-2.3 5.7M20 4.5V11h-6.5',
  reply: 'M10 8L5 12l5 4M5 12h9a5 5 0 015 5v1',
  like: 'M7 10.5v9H4.5a1 1 0 01-1-1v-7a1 1 0 011-1H7zm0 0l3.6-6.6c.2-.4.6-.6 1-.5 1.3.3 2.1 1.5 1.9 2.8l-.5 3.3h4.9a2 2 0 012 2.4l-1.2 6a2 2 0 01-2 1.6H7',
  file: 'M14 3H7a1 1 0 00-1 1v16a1 1 0 001 1h10a1 1 0 001-1V7l-4-4zM14 3v4h4M9 13h6M9 17h4',
  lock: 'M7.5 11V8a4.5 4.5 0 019 0v3M6 11h12v9H6zM12 14.5v2',
  info: 'M12 11v5.5M12 7.5v.3M12 21a9 9 0 110-18 9 9 0 010 18z',
  eye: 'M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12zM12 15a3 3 0 100-6 3 3 0 000 6z',
  eyeOff: 'M4 4l16 16M9.9 5.8A9.6 9.6 0 0112 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 01-2.7 3.5M6.3 7.4A16.6 16.6 0 002.5 12S6 18.5 12 18.5c1.5 0 2.9-.4 4.1-1M9.9 9.9a3 3 0 004.2 4.2',
  mail: 'M3.5 6.5h17v11h-17zM3.5 7l8.5 6.5L20.5 7',
  globe: 'M12 21a9 9 0 100-18 9 9 0 000 18zM3 12h18M12 3c2.5 2.6 3.8 5.6 3.8 9s-1.3 6.4-3.8 9c-2.5-2.6-3.8-5.6-3.8-9S9.5 5.6 12 3z',
  phone: 'M8 2.5h8a1.5 1.5 0 011.5 1.5v16a1.5 1.5 0 01-1.5 1.5H8A1.5 1.5 0 016.5 20V4A1.5 1.5 0 018 2.5zM10.5 5.5h3',
  help: 'M9.3 9.2a2.8 2.8 0 015.4 1c0 1.9-2.7 2.3-2.7 4.1M12 17.4v.3M12 21a9 9 0 110-18 9 9 0 010 18z',
  chat: 'M5 5h14a1 1 0 011 1v10a1 1 0 01-1 1h-8.5L6 20.5V17H5a1 1 0 01-1-1V6a1 1 0 011-1z',
  history: 'M3.5 12a8.5 8.5 0 102.6-6.1M3.5 4.5V9H8M12 7.5V12l3 2',
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 20, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      <path d={paths[name]} />
    </svg>
  );
}
