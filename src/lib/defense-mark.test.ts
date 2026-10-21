import { describe, expect, it } from "vitest";
import { defenseCrescentSpec } from "./defense-mark.ts";

describe("defender crescent", () => {
  it("is a half-ring with sharp side tips and no fill below them", () => {
    const spec = defenseCrescentSpec();
    expect(spec.spanDeg).toBeCloseTo(180);
    expect(spec.rightTip.x).toBeCloseTo(-spec.leftTip.x);
    expect(spec.rightTip.y).toBeCloseTo(spec.leftTip.y);
    expect(Math.abs(spec.rightTip.y)).toBeLessThan(0.4);
    expect(spec.rightTip.x).toBeGreaterThan(spec.innerR);
    expect(spec.topOuter.y).toBeLessThan(spec.topInner.y);
    const thick = spec.topInner.y - spec.topOuter.y;
    expect(thick).toBeGreaterThan(spec.innerR * 0.25);
    expect(thick).toBeLessThan(spec.innerR * 0.5);
    expect(spec.lowestY).toBeLessThan(0.6);
    expect(spec.highestY).toBeLessThan(-spec.innerR);
    let maxX = 0;
    for (const point of spec.points) {
      expect(point.y).toBeLessThanOrEqual(0.6);
      maxX = Math.max(maxX, Math.abs(point.x));
    }
    expect(maxX).toBeLessThanOrEqual(spec.rightTip.x + 0.75);
    expect(spec.rightTip.x).toBeGreaterThan(maxX - 0.75);
    const area = shoelace(spec.points);
    const box = (spec.rightTip.x * 2) * (spec.lowestY - spec.highestY);
    expect(area).toBeGreaterThan(40);
    expect(area).toBeLessThan(box * 0.55);
  });
});

function shoelace(points: Array<{ x: number; y: number }>): number {
  let sum = 0;
  for (let i = 0; i < points.length; i += 1) {
    const next = points[(i + 1) % points.length];
    sum += points[i].x * next.y - next.x * points[i].y;
  }
  return Math.abs(sum) / 2;
}
