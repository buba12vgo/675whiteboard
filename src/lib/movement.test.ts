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
