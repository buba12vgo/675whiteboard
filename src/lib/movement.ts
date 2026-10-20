import type { Stroke, Token } from "@/lib/types";

/** A movement line counts when it starts on the player, within about one token width. */
export const MOVEMENT_SNAP = 1.25;

type XY = { x: number; y: number };

function isPlayer(token: Token): boolean {
  return token.kind !== "ball";
}

/** Solid movement strokes, each kept for the player whose mark is closest to its start. */
export function movementByToken(tokens: Token[], strokes: Stroke[]): Map<string, Stroke> {
  const players = tokens.filter(isPlayer);
  const best = new Map<string, { stroke: Stroke; dist: number; index: number }>();
  strokes.forEach((stroke, index) => {
    if (stroke.style !== "solid" || stroke.points.length < 2) return;
    const start = stroke.points[0];
    let chosen: Token | null = null;
    let dist = MOVEMENT_SNAP;
    for (const token of players) {
      const next = Math.hypot(token.x - start.x, token.y - start.y);
      if (next <= dist) {
        dist = next;
        chosen = token;
      }
    }
    if (!chosen) return;
    const current = best.get(chosen.id);
    const closer = !current || dist < current.dist - 1e-6;
    const sameStartLater = current && Math.abs(dist - current.dist) <= 1e-6 && index > current.index;
    if (closer || sameStartLater) best.set(chosen.id, { stroke, dist, index });
  });
  return new Map([...best].map(([id, value]) => [id, value.stroke]));
}

export function tokensAfterMovements(tokens: Token[], strokes: Stroke[]): Token[] {
  const moves = movementByToken(tokens, strokes);
  return tokens.map((token) => {
    const stroke = moves.get(token.id);
    if (!stroke) return { ...token };
    const end = stroke.points[stroke.points.length - 1];
    return { ...token, x: end.x, y: end.y };
  });
}

export function pointAlong(points: XY[], t: number): XY {
  if (points.length === 0) return { x: 0, y: 0 };
  const clamped = Math.min(1, Math.max(0, t));
  if (points.length === 1 || clamped === 0) return { x: points[0].x, y: points[0].y };
  const lengths: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    const len = Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
    lengths.push(len);
    total += len;
  }
  if (total === 0 || clamped === 1) {
    const last = points[points.length - 1];
    return { x: last.x, y: last.y };
  }
  let dist = total * clamped;
  for (let i = 0; i < lengths.length; i += 1) {
    if (dist <= lengths[i] || i === lengths.length - 1) {
      const span = lengths[i] || 1;
      const u = Math.min(1, dist / span);
      return {
        x: points[i].x + (points[i + 1].x - points[i].x) * u,
        y: points[i].y + (points[i + 1].y - points[i].y) * u,
      };
    }
    dist -= lengths[i];
  }
  const last = points[points.length - 1];
  return { x: last.x, y: last.y };
}

export function movementPath(from: Token, to: Token, stroke: Stroke): XY[] {
  return [
    { x: from.x, y: from.y },
    ...stroke.points.map((point) => ({ x: point.x, y: point.y })),
    { x: to.x, y: to.y },
  ];
}
