import type { Token } from "@/lib/types";

/**
 * Crescent on the upper half of the disc. 0° faces the basket on a half court.
 * The arc is concentric with the number, flush with the ring, thick at the top
 * and sharp at two tips just under the horizontal midline.
 */
const SPAN_DEG = 190;
const HALF_SPAN = (SPAN_DEG / 2) * (Math.PI / 180);
const THICKNESS = 11;

export const DEFENSE_CIRCLE_R = 17;
export const DEFENSE_RING = 4.2;
/** Inner edge sits just under the ring so the arc reads as stuck to the border. */
const INNER_R = DEFENSE_CIRCLE_R + DEFENSE_RING / 2 - 0.5;

function fromUp(radius: number, angle: number) {
  return { x: radius * Math.sin(angle), y: -radius * Math.cos(angle) };
}

const rightTip = fromUp(INNER_R, HALF_SPAN);
const leftTip = fromUp(INNER_R, -HALF_SPAN);
const topY = -INNER_R - THICKNESS;
const outerCenterY = (rightTip.x ** 2 + rightTip.y ** 2 - topY ** 2) / (2 * (rightTip.y - topY));
const outerR = Math.hypot(rightTip.x, rightTip.y - outerCenterY);

function num(value: number) {
  return value.toFixed(2);
}

/** One filled crescent. Inner arc along the disc, outer arc back over the top. */
export const DEFENSE_CRESCENT = `M ${num(leftTip.x)} ${num(leftTip.y)} A ${num(INNER_R)} ${num(INNER_R)} 0 1 0 ${num(rightTip.x)} ${num(rightTip.y)} A ${num(outerR)} ${num(outerR)} 0 1 0 ${num(leftTip.x)} ${num(leftTip.y)} Z`;

const reach = Math.max(rightTip.x, -topY, DEFENSE_CIRCLE_R + DEFENSE_RING / 2, rightTip.y) + 5;
const half = Math.ceil(reach);

/** Square viewBox centered on the number. Y grows downward. */
export const DEFENSE_VIEW = half * 2;
/** Right tip, where the rotate grip sits. */
export const DEFENSE_TIP = { x: rightTip.x, y: rightTip.y };
export const DEFENSE_TIP_X = (DEFENSE_TIP.x + half) / DEFENSE_VIEW;
export const DEFENSE_TIP_Y = (DEFENSE_TIP.y + half) / DEFENSE_VIEW;
export const DEFENSE_LOCAL_ANGLE = Math.atan2(DEFENSE_TIP.y, DEFENSE_TIP.x);
/** The number stays close to an attacker disc. The arc adds a little above it. */
export const DEFENSE_SCALE = (0.9 * DEFENSE_VIEW) / (DEFENSE_CIRCLE_R * 2);

export function defenseCrescentSpec() {
  return {
    spanDeg: SPAN_DEG,
    innerR: INNER_R,
    leftTip,
    rightTip,
    topY,
    lowestY: rightTip.y,
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
