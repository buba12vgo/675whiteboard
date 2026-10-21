import type { Token } from "@/lib/types";

/**
 * Horns on the upper half of the disc. 0° faces the basket on a half court.
 * A semicircle sits on the ring: thick beside the number, pinched to a point
 * on the left and right. The polygon is only that band, so nothing fills behind the number.
 */
const SPAN = Math.PI;
const STEPS = 28;
const TOP_THICK = 5.2;
const TIP_REACH = 7.4;

export const DEFENSE_CIRCLE_R = 17;
export const DEFENSE_RING = 2.8;
/** Inner edge tucks under the ring so the crescent reads as stuck to the border. */
const INNER_R = DEFENSE_CIRCLE_R + DEFENSE_RING / 2 - 0.6;

type XY = { x: number; y: number };

function at(angle: number, radius: number): XY {
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

/** Stays on the ring until the sides, then slides out to the point. */
function sideLift(angle: number): number {
  return Math.pow(Math.abs(Math.sin(angle)), 8);
}

function radii(angle: number): { inner: number; outer: number } {
  const lift = TIP_REACH * sideLift(angle);
  return {
    inner: INNER_R + lift,
    outer: INNER_R + TOP_THICK * Math.pow(Math.cos(angle), 1.35) + lift,
  };
}

function samples(): { angle: number; inner: XY; outer: XY }[] {
  const out: { angle: number; inner: XY; outer: XY }[] = [];
  for (let i = 0; i <= STEPS; i += 1) {
    const angle = -SPAN / 2 + (i / STEPS) * SPAN;
    const ring = radii(angle);
    out.push({ angle, inner: at(angle, ring.inner), outer: at(angle, ring.outer) });
  }
  return out;
}

const crescent = samples();

function num(value: number) {
  return value.toFixed(2);
}

const crescentPoints = [...crescent.map((sample) => sample.inner), ...crescent.map((sample) => sample.outer).reverse()];

/** Filled band only. No arc flags, so mobile browsers cannot close a blob behind the disc. */
export const DEFENSE_CRESCENT = `${crescentPoints
  .map((point, index) => `${index === 0 ? "M" : "L"} ${num(point.x)} ${num(point.y)}`)
  .join(" ")} Z`;

const leftTip = crescent[0].inner;
const rightTip = crescent[crescent.length - 1].inner;
const top = crescent[Math.round(STEPS / 2)];

const reach = Math.max(...crescentPoints.map((point) => Math.max(Math.abs(point.x), Math.abs(point.y)))) + 4;
const half = Math.ceil(reach);

/** Square viewBox centered on the number. Y grows downward. */
export const DEFENSE_VIEW = half * 2;
/** Right tip, where the rotate grip sits. */
export const DEFENSE_TIP = { x: rightTip.x, y: rightTip.y };
export const DEFENSE_TIP_X = (DEFENSE_TIP.x + half) / DEFENSE_VIEW;
export const DEFENSE_TIP_Y = (DEFENSE_TIP.y + half) / DEFENSE_VIEW;
export const DEFENSE_LOCAL_ANGLE = Math.atan2(DEFENSE_TIP.y, DEFENSE_TIP.x);
/** The number stays close to an attacker disc. The horns add a little around it. */
export const DEFENSE_SCALE = (0.92 * DEFENSE_VIEW) / (DEFENSE_CIRCLE_R * 2);

export function defenseCrescentSpec() {
  return {
    spanDeg: (SPAN * 180) / Math.PI,
    innerR: INNER_R,
    leftTip,
    rightTip,
    topInner: top.inner,
    topOuter: top.outer,
    points: crescentPoints,
    lowestY: Math.max(...crescentPoints.map((point) => point.y)),
    highestY: Math.min(...crescentPoints.map((point) => point.y)),
  };
}

export function defenseNumber(label: string): string {
  return label.replace(/^X/i, "");
}

export function drawDefenseMark(
  ctx: CanvasRenderingContext2D,
  token: Pick<Token, "label" | "color" | "rotation">,
  size: number,
) {
  ctx.save();
  ctx.rotate(((token.rotation ?? 0) * Math.PI) / 180);
  const unit = size / DEFENSE_VIEW;
  ctx.scale(unit, unit);
  ctx.fillStyle = token.color;
  ctx.fill(new Path2D(DEFENSE_CRESCENT));
  ctx.beginPath();
  ctx.arc(0, 0, DEFENSE_CIRCLE_R, 0, Math.PI * 2);
  ctx.fillStyle = "#f6f1e6";
  ctx.fill();
  ctx.lineWidth = DEFENSE_RING;
  ctx.strokeStyle = token.color;
  ctx.stroke();
  ctx.fillStyle = token.color;
  ctx.font = "700 18px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(defenseNumber(token.label), 0, 0.5);
  ctx.restore();
}
