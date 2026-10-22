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

export function IconAssist(props: IconProps) {
  return (
    <Svg {...props}>
      <path
        d="M3 16.5c1.2-.6 1.8-1.4 2.4-2M8.2 12.2c.7-.5 1.4-.4 1.8.2.5.8-.2 1.6-1.1 1.7-.8.1-1.5-.6-1.4-1.3"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
      <path d="M10 12.4 17.5 7.2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeDasharray="1.2 2.6" />
      <path d="M13.2 6.4 17.8 6.8 16.6 11.2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function IconHandoff(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M12 3.5v17" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M7.2 13.4h9.6M7.2 17h9.6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
    </Svg>
  );
}

export function IconShot(props: IconProps) {
  return (
    <Svg {...props}>
      <path d="M3 8.2h9.2M3 15.8h9.2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" />
      <path d="M10.6 4.8 17.4 12 10.6 19.2" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round" />
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
      <path d="M9 3.8h6v5.2H9z" stroke="currentColor" strokeWidth="1.4" />
    </Svg>
  );
}
