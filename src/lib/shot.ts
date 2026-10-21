import { BASKET_INSET, COURT_LENGTH, COURT_WIDTH } from "@/lib/geometry";
import type { CourtView, Point, Stroke, Token } from "@/lib/types";

/** Nominal token diameter on the court, in meters. Grows with the court. */
export const TOKEN_DIAMETER = 1.28;
export const TOKEN_PX_MIN = 48;
export const TOKEN_PX_MAX = 108;

/** Shot symbol length, in token diameters. Short enough to read as a mark, not a path. */
export const SHOT_DIAMETERS = 0.7;

/** A stroke started inside this radius of a player becomes their shot. */
export const SHOT_SNAP = 1.65;

const AIM_DRAG = 0.28;

export function tokenPx(scale: number): number {
  const safe = Math.max(scale, 1);
  return Math.min(TOKEN_PX_MAX, Math.max(TOKEN_PX_MIN, safe * TOKEN_DIAMETER));
}

export function tokenRadiusMeters(scale: number): number {
  return tokenPx(scale) / (2 * Math.max(scale, 1));
}

export function shotLengthMeters(scale: number): number {
  return tokenRadiusMeters(scale) * 2 * SHOT_DIAMETERS;
}

/** Screen size of the short double arrow, matched to the token on screen. */
export function shotPaint(scale: number) {
  const diameter = tokenRadiusMeters(scale) * 2 * scale;
  const line = Math.max(1.05, diameter * 0.026);
  return {
    length: diameter * SHOT_DIAMETERS,
    gap: Math.max(line * 2.35, diameter * 0.05),
    line,
    head: Math.max(5, diameter * 0.2),
  };
}

export function basketTarget(x: number, y: number, view: CourtView): { x: number; y: number } {
  const left = { x: BASKET_INSET, y: COURT_WIDTH / 2 };
  const right = { x: COURT_LENGTH - BASKET_INSET, y: COURT_WIDTH / 2 };
  if (view === "half") return left;
  const toLeft = Math.hypot(x - left.x, y - left.y);
  const toRight = Math.hypot(x - right.x, y - right.y);
  return toLeft <= toRight ? left : right;
}

function isShooter(token: Token): boolean {
  return token.kind === "attack" || token.kind === "defense";
}

/** Player the gesture starts on. Ball and obstacle are ignored. */
export function playerForShot(tokens: Token[], gesture: Point[]): Token | null {
  if (gesture.length === 0) return null;
  const origin = gesture[0];
  let best: { token: Token; dist: number } | null = null;
  for (const token of tokens) {
    if (!isShooter(token)) continue;
    const dist = Math.hypot(token.x - origin.x, token.y - origin.y);
    if (dist <= SHOT_SNAP && (!best || dist < best.dist)) best = { token, dist };
  }
  return best?.token ?? null;
}

/** Shooter this shot is glued to, by its start sitting on their rim. */
export function shotOwner(tokens: Token[], stroke: Stroke): Token | null {
  if (stroke.style !== "shot" || stroke.points.length === 0) return null;
  const start = stroke.points[0];
  let best: { token: Token; dist: number } | null = null;
  for (const token of tokens) {
    if (!isShooter(token)) continue;
    const dist = Math.hypot(token.x - start.x, token.y - start.y);
    if (dist <= 1.15 && (!best || dist < best.dist)) best = { token, dist };
  }
  return best?.token ?? null;
}

/**
 * Two court points: the rim of the shooter, then the open arrow tip.
 * A short gesture aims at the nearest basket. A drag aims along the finger.
 * Length stays about 0.7 token diameters.
 */
export function shotPoints(
  player: Token,
  gesture: Point[],
  view: CourtView,
  scale: number,
  forceGesture = false,
): Point[] {
  const basket = basketTarget(player.x, player.y, view);
  let dx = basket.x - player.x;
  let dy = basket.y - player.y;
  if (gesture.length > 0) {
    const end = gesture[gesture.length - 1];
    const start = gesture[0];
    const drag = Math.hypot(end.x - start.x, end.y - start.y);
    if (forceGesture || drag >= AIM_DRAG) {
      const aimX = end.x - player.x;
      const aimY = end.y - player.y;
      if (Math.hypot(aimX, aimY) > 0.05) {
        dx = aimX;
        dy = aimY;
      }
    }
  }
  const len = Math.hypot(dx, dy) || 1;
  const ux = dx / len;
  const uy = dy / len;
  const radius = tokenRadiusMeters(scale);
  const reach = shotLengthMeters(scale);
  return [
    { x: player.x + ux * radius, y: player.y + uy * radius, p: 0.5 },
    { x: player.x + ux * (radius + reach), y: player.y + uy * (radius + reach), p: 0.5 },
  ];
}
