import type { Token } from "@/lib/types";

/** Square viewBox centered on the number. Y grows downward, like the screen. */
export const DEFENSE_VIEW = 130;
export const DEFENSE_CIRCLE_R = 17;
export const DEFENSE_RING = 5.2;
/** Grab point on the right wing, inset from the sharp tip so it sits on the crescent. */
export const DEFENSE_TIP = { x: 46, y: 10 };
export const DEFENSE_TIP_X = (DEFENSE_TIP.x + DEFENSE_VIEW / 2) / DEFENSE_VIEW;
export const DEFENSE_TIP_Y = (DEFENSE_TIP.y + DEFENSE_VIEW / 2) / DEFENSE_VIEW;
/** Angle of the grab point from the number, in screen space. */
export const DEFENSE_LOCAL_ANGLE = Math.atan2(DEFENSE_TIP.y, DEFENSE_TIP.x);
/** Box vs an attacker disc. The wings are wide, so the box is larger than the number. */
export const DEFENSE_SCALE = 2.85;

/**
 * Thick crescent opening upward. The inner edge tucks under the circle
 * and the wings stay wide until the tips.
 */
export const DEFENSE_CRESCENT =
  "M -56 12 C -42 2 -24 28 0 42 C 24 28 42 2 56 12 C 32 24 16 16 0 14 C -16 16 -32 24 -56 12 Z";

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
  ctx.font = "700 20px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(defenseNumber(token.label), 0, 0.5);
  ctx.restore();
}
