import type { ReactNode } from "react";

type IconProps = { className?: string };

function Svg({ className, children }: IconProps & { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" className={className ?? "h-6 w-6"} fill="none" aria-hidden="true">
      {children}
    </svg>
  );
}

export function IconSolid(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 16.5c3-6 6-8 8.2-8.2S16 11 20 6.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconDashed(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M4 16.5c2-.8 2.6-2.4 3.4-3.4M10.2 10c.8-.7 1.5-1.2 2.2-1.2 1.2 0 2 1.2 2.8 2.4M17.2 13.2c.7.8 1.3 1.2 2.8-1.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconDribble(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 14 7 8l4 8 4-8 4 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconShot(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3 14.5c1.4-2.6 2.4-2.6 3.6 0s2.2 2.6 3.6 0 2.2-2.6 3.6 0 2.2 2.6 3.6 0 2-2.4 3.6-1.2"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function IconArrow(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M4 17 16 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M9.5 7.2 16.2 7.6 15.2 14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconTee(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 19V8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M6 8h12" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
    </Svg>
  );
}

export function IconNone(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M5 16.5 17 8" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx="17.5" cy="7.6" r="1.3" fill="currentColor" />
    </Svg>
  );
}

export function IconFullCourt(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="3" y="6" width="18" height="12" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M12 6v12" stroke="currentColor" strokeWidth="1.6" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.6" />
    </Svg>
  );
}

export function IconHalfCourt(props: IconProps) {
  return (
    <Svg {...props}>
      <rect x="6" y="3" width="12" height="18" rx="1" stroke="currentColor" strokeWidth="1.8" />
      <path d="M9 3.8h6v4.2H9z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9 8.2a3 3 0 0 0 6 0" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7 16.5a5 5 0 0 0 10 0" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  );
}
