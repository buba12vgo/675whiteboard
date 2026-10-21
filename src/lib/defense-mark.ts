import type { Token } from "@/lib/types";

/** Square viewBox centered on the number. Y grows downward, like the screen. */
export const DEFENSE_VIEW = 100;
export const DEFENSE_CIRCLE_R = 16;
/** Right wing tip. Rotation 0 leaves the crescent opening upward. */
export const DEFENSE_TIP = { x: 46, y: 10 };
export const DEFENSE_TIP_X = (DEFENSE_TIP.x + DEFENSE_VIEW / 2) / DEFENSE_VIEW;
export const DEFENSE_TIP_Y = (DEFENSE_TIP.y + DEFENSE_VIEW / 2) / DEFENSE_VIEW;
/** Angle of the right tip from the number, in screen space. */
export const DEFENSE_LOCAL_ANGLE = Math.atan2(DEFENSE_TIP.y, DEFENSE_TIP.x);
/**
 * Box vs an attacker disc. The circle stays close to the other fichas
 * and the wings fit inside the same square.
 */
export const DEFENSE_SCALE = 2.4;

export const DEFENSE_CRESCENT =
  "M -46 10 C -40 8 -16 22 0 34 C 16 22 40 8 46 10 C 22 18 8 11 0 11 C -8 11 -22 18 -46 10 Z";

export function defenseNumber(label: string): string {
  return label.replace(/^X/i, "");
}

export function traceDefenseCrescent(ctx: CanvasRenderingContext2D) {
  ctx.beginPath();
  ctx.moveTo(-46, 10);
  ctx.bezierCurveTo(-40, 8, -16, 22, 0, 34);
  ctx.bezierCurveTo(16, 22, 40, 8, 46, 10);
  ctx.bezierCurveTo(22, 18, 8, 11, 0, 11);
  ctx.bezierCurveTo(-8, 11, -22, 18, -46, 10);
  ctx.closePath();
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
  traceDefenseCrescent(ctx);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(0, 0, DEFENSE_CIRCLE_R, 0, Math.PI * 2);
  ctx.fillStyle = "#f6f1e6";
  ctx.fill();
  ctx.lineWidth = 3.4;
  ctx.strokeStyle = token.color;
  ctx.stroke();
  ctx.fillStyle = token.color;
  ctx.font = "700 18px Outfit, sans-serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(defenseNumber(token.label), 0, 0.5);
  ctx.restore();
}
