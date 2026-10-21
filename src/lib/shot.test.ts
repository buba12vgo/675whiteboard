import { describe, expect, it } from "vitest";
import { basketTarget, playerForShot, shotLengthMeters, shotOwner, shotPoints, TOKEN_DIAMETER, tokenRadiusMeters } from "./shot.ts";
import type { Stroke, Token } from "./types.ts";

const shooter: Token = {
  id: "atk-1",
  kind: "attack",
  label: "1",
  color: "#0f766e",
  x: 8,
  y: 7.5,
};

const ball: Token = {
  id: "ball",
  kind: "ball",
  label: "",
  color: "#e86b1f",
  x: 8.2,
  y: 7.2,
};

describe("shot symbol", () => {
  it("stays between one and one and a half token diameters", () => {
    for (const scale of [30, 48, 70, 110]) {
      const ratio = shotLengthMeters(scale) / (tokenRadiusMeters(scale) * 2);
      expect(ratio).toBeCloseTo(1.25);
      expect(ratio).toBeGreaterThanOrEqual(1);
      expect(ratio).toBeLessThanOrEqual(1.5);
    }
  });

  it("aims a tap at the basket and starts on the rim", () => {
    const points = shotPoints(shooter, [{ x: 8, y: 7.5, p: 0.5 }], "half", 60);
    const basket = basketTarget(shooter.x, shooter.y, "half");
    expect(basket.x).toBeLessThan(shooter.x);
    expect(points[0].y).toBeCloseTo(7.5);
    expect(points[1].y).toBeCloseTo(7.5);
    expect(points[0].x).toBeCloseTo(shooter.x - tokenRadiusMeters(60));
    expect(points[1].x).toBeLessThan(points[0].x);
    const length = points[0].x - points[1].x;
    expect(length).toBeCloseTo(TOKEN_DIAMETER * 1.25);
  });

  it("follows a drag and ignores the ball", () => {
    expect(playerForShot([ball, shooter], [{ x: 8.1, y: 7.4, p: 0.5 }])?.id).toBe("atk-1");
    expect(playerForShot([ball], [{ x: 8.2, y: 7.2, p: 0.5 }])).toBeNull();
    const points = shotPoints(
      shooter,
      [
        { x: 8, y: 7.5, p: 0.5 },
        { x: 8, y: 11, p: 0.5 },
      ],
      "half",
      60,
    );
    expect(points[1].y).toBeGreaterThan(points[0].y);
    expect(points[1].x).toBeCloseTo(points[0].x);
    expect(playerForShot([shooter], [{ x: 2, y: 2, p: 0.5 }])).toBeNull();
  });

  it("belongs to the shooter it touches", () => {
    const stroke: Stroke = {
      id: "shot",
      points: shotPoints(shooter, [{ x: 8, y: 7.5, p: 0.5 }], "half", 60),
      color: "#111",
      width: 0.1,
      style: "shot",
      cap: "none",
    };
    expect(shotOwner([ball, shooter], stroke)?.id).toBe("atk-1");
  });
});
