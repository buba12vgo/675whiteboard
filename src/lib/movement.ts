import type { Stroke, Token } from "@/lib/types";

/** A movement line counts when it starts on the player, within about one token width. */
export const MOVEMENT_SNAP = 1.25;

/** A pass drawn on a player still moves the ball when that player is holding it. */
export const PASS_HOLD = 1.8;

type XY = { x: number; y: number };

function isPlayer(token: Token): boolean {
  return token.kind === "attack" || token.kind === "defense";
}

function isPass(style: Stroke["style"]): boolean {
  return style === "dashed" || style === "assist" || style === "handoff";
}

/** The attacker who has the ball. The board draws the ball beside that player. */
export function ballHolderId(tokens: Token[]): string | null {
  const ball = tokens.find((token) => token.kind === "ball");
  if (!ball) return null;
  let best: { id: string; dist: number } | null = null;
  for (const token of tokens) {
    if (token.kind !== "attack") continue;
    const dist = Math.hypot(token.x - ball.x, token.y - ball.y);
    if (dist <= PASS_HOLD && (!best || dist < best.dist)) best = { id: token.id, dist };
  }
  return best?.id ?? null;
}

function remember(
  best: Map<string, { stroke: Stroke; dist: number; index: number }>,
  id: string,
  stroke: Stroke,
  dist: number,
  index: number,
) {
  const current = best.get(id);
  const closer = !current || dist < current.dist - 1e-6;
  const sameStartLater = current && Math.abs(dist - current.dist) <= 1e-6 && index > current.index;
  if (closer || sameStartLater) best.set(id, { stroke, dist, index });
}

/**
 * Solid strokes move the player they start on.
 * Dashed passes, assists, and hand-offs move the ball when they start on it, or on the player holding it.
 * The closest start wins; a later stroke breaks a tie. Shots and dribbles stay put.
 */
export function movementByToken(tokens: Token[], strokes: Stroke[]): Map<string, Stroke> {
  const players = tokens.filter(isPlayer);
  const ball = tokens.find((token) => token.kind === "ball") ?? null;
  const best = new Map<string, { stroke: Stroke; dist: number; index: number }>();
  strokes.forEach((stroke, index) => {
    if (stroke.points.length < 2) return;
    const start = stroke.points[0];
    if (stroke.style === "solid") {
      let chosen: Token | null = null;
      let dist = MOVEMENT_SNAP;
      for (const token of players) {
        const next = Math.hypot(token.x - start.x, token.y - start.y);
        if (next <= dist) {
          dist = next;
          chosen = token;
        }
      }
      if (chosen) remember(best, chosen.id, stroke, dist, index);
      return;
    }
    if (!isPass(stroke.style) || !ball) return;
    const toBall = Math.hypot(ball.x - start.x, ball.y - start.y);
    if (toBall <= MOVEMENT_SNAP) {
      remember(best, ball.id, stroke, toBall, index);
      return;
    }
    let holder: Token | null = null;
    let holderDist = MOVEMENT_SNAP;
    for (const token of players) {
      const next = Math.hypot(token.x - start.x, token.y - start.y);
      if (next <= holderDist) {
        holderDist = next;
        holder = token;
      }
    }
    if (!holder) return;
    const hands = Math.hypot(holder.x - ball.x, holder.y - ball.y);
    if (hands <= PASS_HOLD) remember(best, ball.id, stroke, toBall, index);
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
