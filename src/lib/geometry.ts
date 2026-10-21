import type { CourtView } from "@/lib/types";

/**
 * FIBA court, meters. The three-point line is the current one: a 6.75 m arc
 * from the basket centre, with straight corners 0.90 m from each sideline
 * (6.60 m from the basket) running parallel to the sideline until they meet the arc.
 * The lane is a 4.90 m rectangle; the free-throw line is 5.80 m from the baseline.
 */
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
/** Distance from the sideline to the corner three. 7.50 − 0.90 = 6.60 m from the basket. */
export const THREE_CORNER = 0.9;
export const THREE_CORNER_FROM_BASKET = COURT_WIDTH / 2 - THREE_CORNER;
export const NO_CHARGE_RADIUS = 1.25;
export const RIM_RADIUS = 0.225;
export const LINE_WIDTH = 0.05;

/**
 * Minibasket, FEB / NIDE 2024 and FEGABA 2025, drawn on the same 28×15 court.
 * The backboard stays at 1.20 m (NIDE). A plan reading of 975 mm is not used.
 * The free-throw line's far edge is 4.00 m from the backboard, so 5.20 m from
 * the baseline — not the 4.60 m depth read off that plan (4.60 m is the FIBA
 * gap from backboard to the 5.80 m line). The free-throw line itself is 3.60 m
 * long; the restricted area continues it out to 4.90 m.
 * FEGABA 2.4.4 marks an 8 m rectangle whose front is that same 4 m from the
 * backboard. It is the minibasket 2/3 boundary, not the FIBA 6.75 arc, so the
 * arc is omitted. Smaller allowed venues (26×14 … 20×11) stay off the board.
 */
export const MINI_FT_FROM_BOARD = 4;
export const MINI_FRONT = BACKBOARD_INSET + MINI_FT_FROM_BOARD;
export const MINI_FT_LENGTH = 3.6;
export const MINI_LANE_HALF = KEY_WIDTH / 2;
export const MINI_BOX_HALF = 4;
export const MINI_ARC = FT_RADIUS;
/** Tick length on the lane, matching the 100 mm marks on the reference plan. */
export const MINI_MARK = 0.1;
/**
 * Rebound places along the lane, metres from the baseline.
 * FEGABA points at a diagram without publishing the millimetres, so these follow
 * the FIBA spacing (1.75 m, then every 0.85 m) while staying clear of the 5.20 m line.
 */
export const MINI_MARK_AT = [1.75, 2.6, 3.45, 4.3];

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

export function miniLayout(side: "left" | "right") {
  const sign = side === "left" ? 1 : -1;
  const baseline = side === "left" ? 0 : COURT_LENGTH;
  const front = baseline + sign * MINI_FRONT;
  const mid = COURT_WIDTH / 2;
  return {
    baseline,
    front,
    mid,
    sign,
    laneY: [mid - MINI_LANE_HALF, mid + MINI_LANE_HALF] as const,
    boxY: [mid - MINI_BOX_HALF, mid + MINI_BOX_HALF] as const,
  };
}

/** Semicircle beyond the free-throw line, away from the basket. */
export function miniFreeThrowArc(side: "left" | "right"): Meter[] {
  const { front, mid } = miniLayout(side);
  const a0 = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  const a1 = side === "left" ? Math.PI / 2 : (Math.PI * 3) / 2;
  return arcPoints(front, mid, MINI_ARC, a0, a1, 48);
}

/** 100 mm ticks outside each lane line. */
export function miniTicks(side: "left" | "right"): Meter[][] {
  const { baseline, mid, laneY, sign } = miniLayout(side);
  return MINI_MARK_AT.flatMap((distance) => {
    const x = baseline + sign * distance;
    return laneY.map((y) => {
      const outward = y < mid ? -1 : 1;
      return [
        { x, y },
        { x, y: y + outward * MINI_MARK },
      ];
    });
  });
}

export function arcPoints(cx: number, cy: number, radius: number, a0: number, a1: number, steps = 48): Meter[] {
  const pts: Meter[] = [];
  for (let i = 0; i <= steps; i += 1) {
    const t = a0 + ((a1 - a0) * i) / steps;
    pts.push({ x: cx + Math.cos(t) * radius, y: cy + Math.sin(t) * radius });
  }
  return pts;
}
