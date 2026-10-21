import { movementByToken, movementPath, pointAlong } from "@/lib/movement";
import type { Stroke, Token } from "@/lib/types";

export type DisplayToken = Token & { opacity: number };

/** Shortest-path blend so a defender does not spin the long way around. */
export function lerpAngle(from: number, to: number, t: number): number {
  const a = ((from % 360) + 360) % 360;
  const b = ((to % 360) + 360) % 360;
  let delta = b - a;
  if (delta > 180) delta -= 360;
  if (delta < -180) delta += 360;
  return (a + delta * t + 360) % 360;
}

export function interpolateTokens(from: Token[], to: Token[], t: number, strokes: Stroke[] = []): DisplayToken[] {
  const next = new Map(to.map((token) => [token.id, token]));
  const moves = movementByToken(from, strokes);
  const seen = new Set<string>();
  const out: DisplayToken[] = [];
  for (const token of from) {
    seen.add(token.id);
    const target = next.get(token.id);
    if (!target) {
      out.push({ ...token, opacity: 1 - t });
      continue;
    }
    const stroke = moves.get(token.id);
    const along = stroke ? pointAlong(movementPath(token, target, stroke), t) : null;
    const rotation =
      token.rotation !== undefined || target.rotation !== undefined
        ? lerpAngle(token.rotation ?? 0, target.rotation ?? 0, t)
        : undefined;
    out.push({
      ...token,
      x: along ? along.x : token.x + (target.x - token.x) * t,
      y: along ? along.y : token.y + (target.y - token.y) * t,
      ...(rotation === undefined ? {} : { rotation }),
      opacity: 1,
    });
  }
  for (const token of to) {
    if (!seen.has(token.id)) out.push({ ...token, opacity: t });
  }
  return out;
}
