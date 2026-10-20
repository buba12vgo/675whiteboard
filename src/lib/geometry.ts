import type { CourtView } from "@/lib/types";

/** FIBA court, meters. Basket centers sit 1.575 m in from each baseline. */
export const COURT_LENGTH = 28;
export const COURT_WIDTH = 15;
export const HALF_LENGTH = 14;
export const BASKET_INSET = 1.575;
export const BACKBOARD_INSET = 1.2;
export const KEY_WIDTH = 4.9;
export const KEY_LENGTH = 5.8;
export const FT_RADIUS = 1.8;
export const CENTER_RADIUS = 1.8;
export const THREE_RADIUS = 6.75;
export const THREE_CORNER = 0.9;
export const NO_CHARGE_RADIUS = 1.25;
export const RIM_RADIUS = 0.225;
export const LINE_WIDTH = 0.05;

const THREE_DY = COURT_WIDTH / 2 - THREE_CORNER;
export const THREE_DX = Math.sqrt(THREE_RADIUS * THREE_RADIUS - THREE_DY * THREE_DY);
export const THREE_ALPHA = Math.atan2(THREE_DY, THREE_DX);

export type Meter = { x: number; y: number };
export type Screen = { x: number; y: number };
export type Orientation = "length-x" | "length-y" | "half";

export type CourtTransform = {
  view: CourtView;
  orientation: Orientation;
  rect: { x: number; y: number; w: number; h: number };
  scale: number;
  visible: { x0: number; y0: number; x1: number; y1: number };
  toScreen: (x: number, y: number) => Screen;
  toCourt: (sx: number, sy: number) => Meter;
};

function fittedSize(boardW: number, boardH: number, pad: number, metersWide: number, metersTall: number) {
  const bw = Math.max(1, boardW - pad * 2);
  const bh = Math.max(1, boardH - pad * 2);
  const scale = Math.min(bw / metersWide, bh / metersTall);
  const w = metersWide * scale;
  const h = metersTall * scale;
  return {
    x: (boardW - w) / 2,
    y: (boardH - h) / 2,
    w,
    h,
    scale,
    area: w * h,
  };
}

export function fitCourt(view: CourtView, boardW: number, boardH: number, pad = 16): CourtTransform {
  if (view === "half") {
    const placed = fittedSize(boardW, boardH, pad, COURT_WIDTH, HALF_LENGTH);
    const rect = { x: placed.x, y: placed.y, w: placed.w, h: placed.h };
    const scale = placed.scale;
    return {
      view,
      orientation: "half",
      rect,
      scale,
      visible: { x0: 0, y0: 0, x1: HALF_LENGTH, y1: COURT_WIDTH },
      toScreen: (x, y) => ({
        x: rect.x + (y / COURT_WIDTH) * rect.w,
        y: rect.y + (x / HALF_LENGTH) * rect.h,
      }),
      toCourt: (sx, sy) => ({
        x: ((sy - rect.y) / rect.h) * HALF_LENGTH,
        y: ((sx - rect.x) / rect.w) * COURT_WIDTH,
      }),
    };
  }

  const landscape = fittedSize(boardW, boardH, pad, COURT_LENGTH, COURT_WIDTH);
  const portrait = fittedSize(boardW, boardH, pad, COURT_WIDTH, COURT_LENGTH);
  const usePortrait = portrait.area > landscape.area + 1;
  const placed = usePortrait ? portrait : landscape;
  const rect = { x: placed.x, y: placed.y, w: placed.w, h: placed.h };
  const scale = placed.scale;

  if (usePortrait) {
    return {
      view,
      orientation: "length-y",
      rect,
      scale,
      visible: { x0: 0, y0: 0, x1: COURT_LENGTH, y1: COURT_WIDTH },
      toScreen: (x, y) => ({
        x: rect.x + (y / COURT_WIDTH) * rect.w,
        y: rect.y + (x / COURT_LENGTH) * rect.h,
      }),
      toCourt: (sx, sy) => ({
        x: ((sy - rect.y) / rect.h) * COURT_LENGTH,
        y: ((sx - rect.x) / rect.w) * COURT_WIDTH,
      }),
    };
  }

  return {
    view,
    orientation: "length-x",
    rect,
    scale,
    visible: { x0: 0, y0: 0, x1: COURT_LENGTH, y1: COURT_WIDTH },
    toScreen: (x, y) => ({
      x: rect.x + (x / COURT_LENGTH) * rect.w,
      y: rect.y + (y / COURT_WIDTH) * rect.h,
    }),
    toCourt: (sx, sy) => ({
      x: ((sx - rect.x) / rect.w) * COURT_LENGTH,
      y: ((sy - rect.y) / rect.h) * COURT_WIDTH,
    }),
  };
}

export function arcPoints(cx: number, cy: number, radius: number, a0: number, a1: number, steps = 48): Meter[] {
  const pts: Meter[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = a0 + ((a1 - a0) * i) / steps;
    pts.push({ x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius });
  }
  return pts;
}
