import { describe, expect, it } from "vitest";
import { CRESCENT_RATIO, MARK_R, defenseCrescentSpec } from "./defense-mark.ts";

describe("defender crescent", () => {
  it("is one symmetric circular crescent, 18% of the radius, ending on the equator", () => {
    const spec = defenseCrescentSpec();
    expect(spec.path.match(/A /g)?.length).toBe(3);
    expect(spec.path.match(/L /g)?.length).toBe(2);
    expect(spec.topThickness / spec.radius).toBeCloseTo(CRESCENT_RATIO);
    expect(spec.topThickness / MARK_R).toBeGreaterThanOrEqual(0.15);
    expect(spec.topThickness / MARK_R).toBeLessThanOrEqual(0.2);
    expect(spec.rightTip.x).toBeCloseTo(-spec.leftTip.x);
    expect(spec.rightTip.y).toBeCloseTo(0);
    expect(spec.leftTip.y).toBeCloseTo(0);
    expect(spec.apex.x).toBeCloseTo(0);
    expect(spec.apex.y).toBeCloseTo(-(spec.edge + spec.topThickness));
    expect(Math.abs(Math.abs(spec.rightTip.x) - spec.edge)).toBeLessThan(0.6);
    expect(Math.abs(spec.rightTip.x)).toBeLessThan(spec.radius + spec.ring);
    expect(spec.outerCenterY).toBeLessThan(0);
    expect(Math.hypot(spec.rightTip.x, spec.rightTip.y - spec.outerCenterY)).toBeCloseTo(spec.outerR);
    expect(Math.hypot(spec.apex.x, spec.apex.y - spec.outerCenterY)).toBeCloseTo(spec.outerR);
    expect(spec.innerR).toBeLessThan(spec.radius);
  });
});
