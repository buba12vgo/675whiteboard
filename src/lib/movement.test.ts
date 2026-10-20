import { describe, expect, it } from "vitest";
import { movementByToken, pointAlong, tokensAfterMovements } from "@/lib/movement";
import { interpolateTokens } from "@/lib/playback";
import type { Stroke, Token } from "@/lib/types";

const player: Token = { id: "atk-1", kind: "attack", label: "1", color: "#000", x: 2, y: 2 };
const other: Token = { id: "atk-2", kind: "attack", label: "2", color: "#111", x: 10, y: 10 };
const ball: Token = { id: "ball", kind: "ball", label: "", color: "#e86b1f", x: 2.2, y: 2.4 };

function stroke(partial: Partial<Stroke> & Pick<Stroke, "points" | "style">): Stroke {
  return {
    id: "s",
    color: "#111",
    width: 0.1,
    cap: "arrow",
    ...partial,
  };
}

describe("movements", () => {
  it("lands the player on the tip of her movement arrow", () => {
    const line = stroke({
      points: [
        { x: 2.1, y: 2.2, p: 0.5 },
        { x: 2.1, y: 6, p: 0.5 },
        { x: 7, y: 6, p: 0.5 },
      ],
      style: "solid",
    });
    const next = tokensAfterMovements([player, other, ball], [line]);
    expect(next.find((token) => token.id === "atk-1")).toMatchObject({ x: 7, y: 6 });
    expect(next.find((token) => token.id === "atk-2")).toMatchObject({ x: 10, y: 10 });
    expect(next.find((token) => token.id === "ball")).toMatchObject({ x: 2.2, y: 2.4 });
  });

  it("ignores passes and lines that do not start on a player", () => {
    const pass = stroke({
      points: [
        { x: 2, y: 2, p: 0.5 },
        { x: 8, y: 8, p: 0.5 },
      ],
      style: "dashed",
    });
    const stray = stroke({
      id: "far",
      points: [
        { x: 6, y: 6, p: 0.5 },
        { x: 8, y: 8, p: 0.5 },
      ],
      style: "solid",
    });
    expect(movementByToken([player], [pass, stray]).size).toBe(0);
  });

  it("puts the ball on the tip of a pass that starts on it", () => {
    const pass = stroke({
      points: [
        { x: 2.3, y: 2.5, p: 0.5 },
        { x: 2.3, y: 8, p: 0.5 },
        { x: 11, y: 8, p: 0.5 },
      ],
      style: "dashed",
    });
    const next = tokensAfterMovements([player, other, ball], [pass]);
    expect(next.find((token) => token.id === "ball")).toMatchObject({ x: 11, y: 8 });
    expect(next.find((token) => token.id === "atk-1")).toMatchObject({ x: 2, y: 2 });
  });

  it("moves the ball when the pass is drawn from the player holding it", () => {
    const held: Token = { ...ball, x: 3.6, y: 2 };
    const pass = stroke({
      points: [
        { x: 2.1, y: 2.1, p: 0.5 },
        { x: 9, y: 4, p: 0.5 },
      ],
      style: "dashed",
    });
    const next = tokensAfterMovements([player, held], [pass]);
    expect(next.find((token) => token.id === "ball")).toMatchObject({ x: 9, y: 4 });
    expect(next.find((token) => token.id === "atk-1")).toMatchObject({ x: 2, y: 2 });
  });

  it("leaves the ball when the pass does not start on the ball or its holder", () => {
    const pass = stroke({
      points: [
        { x: 10, y: 10, p: 0.5 },
        { x: 14, y: 12, p: 0.5 },
      ],
      style: "dashed",
    });
    const next = tokensAfterMovements([player, other, ball], [pass]);
    expect(next.find((token) => token.id === "ball")).toMatchObject({ x: 2.2, y: 2.4 });
  });

  it("follows the pass curve and ignores a shot", () => {
    const pass = stroke({
      points: [
        { x: 2.2, y: 2.4, p: 0.5 },
        { x: 2.2, y: 9, p: 0.5 },
        { x: 8, y: 9, p: 0.5 },
      ],
      style: "dashed",
    });
    const shot = stroke({
      id: "shot",
      points: [
        { x: 2.2, y: 2.4, p: 0.5 },
        { x: 6, y: 1, p: 0.5 },
      ],
      style: "shot",
    });
    expect(movementByToken([player, ball], [shot]).size).toBe(0);
    const from = ball;
    const to = { ...ball, x: 8, y: 9 };
    const mid = interpolateTokens([from], [to], 0.5, [pass]);
    expect(mid[0].x).toBeCloseTo(2.2, 1);
    expect(mid[0].y).toBeGreaterThan(8);
  });

  it("follows the bend instead of the straight chord", () => {
    const line = stroke({
      points: [
        { x: 0, y: 0, p: 0.5 },
        { x: 0, y: 10, p: 0.5 },
        { x: 10, y: 10, p: 0.5 },
      ],
      style: "solid",
    });
    const from: Token = { ...player, x: 0, y: 0 };
    const to: Token = { ...from, x: 10, y: 10 };
    const mid = interpolateTokens([from], [to], 0.5, [line]);
    expect(mid[0].x).toBeCloseTo(0, 1);
    expect(mid[0].y).toBeCloseTo(10, 1);
    expect(pointAlong(line.points, 0.25).y).toBeCloseTo(5);
  });
});
