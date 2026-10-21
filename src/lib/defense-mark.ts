import type { Token } from "@/lib/types";

/**
 * One disc for every player. The defender adds a single crescent, like the
 * FEB umbrella: it sits just outside the ring, is thickest at the top, and
 * ends in two fine horns below the midline. 0° keeps that arc on the upper half.
 */
export const MARK_R = 36;
export const MARK_RING = 4.2;
/** Visible thickness at the top, as a fraction of the disc radius. */
export const CRESCENT_RATIO = 0.4;
/** Attack ring, thick enough to read against the cream disc. */
export const ATTACK_RING = 7.6;
/** Ball element size relative to a player token. */
export const BALL_BOX = 0.5;
/** Drawn ball radius relative to that element. */
export const BALL_DRAW_R = 0.44;

export const DISC_FILL = "#f7f5f0";
export const BALL_FILL = "#e36a1c";
export const BALL_INK = "#24160f";
export const MARK_FONT = 30;

const EDGE = MARK_R + MARK_RING / 2;
/** Clear gap between the filled disc and the inner edge of the crescent. */
const GAP = 5.2;
/** How far each horn sticks out past the disc, and how far it drops below center. */
const TIP_OUT = 11;
const TIP_DROP = 16;
const CROWN = MARK_R + GAP;
const APEX = CROWN + CRESCENT_RATIO * MARK_R;

type XY = { x: number; y: number };

const rightTip: XY = { x: MARK_R + TIP_OUT, y: TIP_DROP };
const leftTip: XY = { x: -rightTip.x, y: rightTip.y };
const innerCrown: XY = { x: 0, y: -CROWN };
const apex: XY = { x: 0, y: -APEX };

function circleOnAxis(crownY: number, tip: XY): { cy: number; r: number } {
  const cy = (tip.x * tip.x + tip.y * tip.y - crownY * crownY) / (2 * (tip.y - crownY));
  return { cy, r: Math.hypot(tip.x, tip.y - cy) };
}

const innerCircle = circleOnAxis(innerCrown.y, rightTip);
const outerCircle = circleOnAxis(apex.y, rightTip);
const INNER_R = innerCircle.r;
const INNER_CY = innerCircle.cy;
const OUTER_R = outerCircle.r;
const OUTER_CY = outerCircle.cy;

const ATTACK_PAD = ATTACK_RING / 2 + 2;
export const ATTACK_VIEW = (MARK_R + ATTACK_PAD) * 2;

function arcCenter(start: XY, end: XY, radius: number, large: number, sweep: number): XY {
  const dx2 = (start.x - end.x) / 2;
  const dy2 = (start.y - end.y) / 2;
  const den = radius * radius * dy2 * dy2 + radius * radius * dx2 * dx2;
  let root = radius ** 4 - radius * radius * dy2 * dy2 - radius * radius * dx2 * dx2;
  if (root < 0) root = 0;
  let coef = den === 0 ? 0 : Math.sqrt(root / den);
  if (large === sweep) coef = -coef;
  return {
    x: coef * dy2 + (start.x + end.x) / 2,
    y: -coef * dx2 + (start.y + end.y) / 2,
  };
}

function arcMid(start: XY, end: XY, radius: number, large: number, sweep: number): XY {
  const center = arcCenter(start, end, radius, large, sweep);
  const a0 = Math.atan2(start.y - center.y, start.x - center.x);
  const a1 = Math.atan2(end.y - center.y, end.x - center.x);
  let delta = a1 - a0;
  if (sweep === 1) {
    if (delta <= 0) delta += Math.PI * 2;
  } else if (delta >= 0) delta -= Math.PI * 2;
  const mid = a0 + delta / 2;
  return { x: center.x + radius * Math.cos(mid), y: center.y + radius * Math.sin(mid) };
}

function chooseArc(start: XY, end: XY, radius: number, target: XY): { large: number; sweep: number } {
  let best: { large: number; sweep: number; miss: number } | null = null;
  for (const large of [0, 1]) {
    for (const sweep of [0, 1]) {
      const mid = arcMid(start, end, radius, large, sweep);
      const miss = Math.hypot(mid.x - target.x, mid.y - target.y);
      if (!best || miss < best.miss) best = { large, sweep, miss };
    }
  }
  if (!best || best.miss > 1.25) throw new Error("crescent arc");
  return best;
}

const innerArc = chooseArc(leftTip, rightTip, INNER_R, innerCrown);
const outerArc = chooseArc(rightTip, leftTip, OUTER_R, apex);

function n(value: number) {
  return value.toFixed(2);
}

function arc(to: XY, radius: number, flag: { large: number; sweep: number }) {
  return `A ${n(radius)} ${n(radius)} 0 ${flag.large} ${flag.sweep} ${n(to.x)} ${n(to.y)}`;
}

/** One filled crescent: inner arc just outside the ring, outer arc through the crown, meeting at the horns. */
export const DEFENSE_CRESCENT = `M ${n(leftTip.x)} ${n(leftTip.y)} ${arc(rightTip, INNER_R, innerArc)} ${arc(leftTip, OUTER_R, outerArc)} Z`;

const reach = Math.max(APEX, rightTip.x, rightTip.y) + 4;
const half = Math.ceil(reach);
export const DEFENSE_VIEW = half * 2;
export const DEFENSE_TIP = { x: rightTip.x, y: rightTip.y };
export const DEFENSE_TIP_X = (DEFENSE_TIP.x + half) / DEFENSE_VIEW;
export const DEFENSE_TIP_Y = (DEFENSE_TIP.y + half) / DEFENSE_VIEW;
export const DEFENSE_LOCAL_ANGLE = Math.atan2(DEFENSE_TIP.y, DEFENSE_TIP.x);
/** Disc diameter matches an attacker. The crescent uses the spare space above. */
export const DEFENSE_SCALE = DEFENSE_VIEW / ATTACK_VIEW;

export const DEFENSE_CIRCLE_R = MARK_R;
export const DEFENSE_RING = MARK_RING;
export const NUMBER_ON_FILL = "#ffffff";

export function discOuterPx(tokenSize: number): number {
  return (tokenSize * (MARK_R * 2 + ATTACK_RING)) / ATTACK_VIEW;
}

export function defenseCrescentSpec() {
  return {
    radius: MARK_R,
    ring: MARK_RING,
    ratio: CRESCENT_RATIO,
    edge: EDGE,
    gap: GAP,
    innerR: INNER_R,
    innerCenterY: INNER_CY,
    apex,
    innerCrown,
    leftTip,
    rightTip,
    outerCenterY: OUTER_CY,
    outerR: OUTER_R,
    path: DEFENSE_CRESCENT,
    topThickness: APEX - CROWN,
  };
}

export function defenseNumber(label: string): string {
  return label.replace(/^X/i, "");
}

function paintDisc(
  ctx: CanvasRenderingContext2D,
  options: { fill: string; stroke: string; strokeWidth: number; label: string; text: string },
) {
  ctx.beginPath();
  ctx.arc(0, 0, MARK_R, 0, Math.PI * 2);
  ctx.fillStyle = options.fill;
  ctx.fill();
  if (options.strokeWidth > 0) {
    ctx.lineWidth = options.strokeWidth;
    ctx.strokeStyle = options.stroke;
    ctx.lineJoin = "round";
    ctx.lineCap = "butt";
    ctx.stroke();
  }
  ctx.fillStyle = options.text;
  ctx.font = `700 ${MARK_FONT}px Outfit, sans-serif`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(options.label, 0, 1.2);
}

export function drawAttackMark(ctx: CanvasRenderingContext2D, color: string, label: string, size: number) {
  ctx.save();
  ctx.scale(size / ATTACK_VIEW, size / ATTACK_VIEW);
  paintDisc(ctx, { fill: DISC_FILL, stroke: color, strokeWidth: ATTACK_RING, label, text: color });
  ctx.restore();
}

export function drawDefenseMark(
  ctx: CanvasRenderingContext2D,
  token: Pick<Token, "label" | "color" | "rotation">,
  size: number,
) {
  ctx.save();
  ctx.rotate(((token.rotation ?? 0) * Math.PI) / 180);
  ctx.scale(size / DEFENSE_VIEW, size / DEFENSE_VIEW);
  ctx.fillStyle = token.color;
  ctx.fill(new Path2D(DEFENSE_CRESCENT), "evenodd");
  paintDisc(ctx, {
    fill: token.color,
    stroke: token.color,
    strokeWidth: 0,
    label: defenseNumber(token.label),
    text: NUMBER_ON_FILL,
  });
  ctx.restore();
}

export function drawBallMark(ctx: CanvasRenderingContext2D, size: number) {
  const r = size * BALL_DRAW_R;
  const ring = size * 0.055;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = BALL_FILL;
  ctx.fill();
  ctx.lineWidth = ring;
  ctx.strokeStyle = BALL_INK;
  ctx.lineCap = "butt";
  ctx.stroke();
  const reachSeam = r - ring;
  ctx.beginPath();
  ctx.moveTo(-reachSeam, 0);
  ctx.lineTo(reachSeam, 0);
  ctx.moveTo(0, -reachSeam);
  ctx.lineTo(0, reachSeam);
  ctx.lineWidth = size * 0.036;
  ctx.stroke();
}
