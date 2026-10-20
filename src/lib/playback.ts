import { movementByToken, movementPath, pointAlong } from "@/lib/movement";
import type { Stroke, Token } from "@/lib/types";

export type DisplayToken = Token & { opacity: number };

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
    out.push({
      ...token,
      x: along ? along.x : token.x + (target.x - token.x) * t,
      y: along ? along.y : token.y + (target.y - token.y) * t,
      opacity: 1,
    });
  }
  for (const token of to) {
    if (!seen.has(token.id)) out.push({ ...token, opacity: t });
  }
  return out;
}
