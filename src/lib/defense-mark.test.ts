import { describe, expect, it } from "vitest";
import { CRESCENT_RATIO, MARK_R, defenseCrescentSpec } from "./defense-mark.ts";

describe("defender crescent", () => {
  it("is an umbrella arc: thick at the crown, with two horns below the midline", () => {
    const spec = defenseCrescentSpec();
    expect(spec.path.match(/A /g)?.length).toBe(2);
    expect(spec.path.includes("L ")).toBe(false);
    expect(spec.topThickness / spec.radius).toBeCloseTo(CRESCENT_RATIO);
    expect(spec.topThickness / MARK_R).toBeGreaterThanOrEqual(0.36);
    expect(spec.topThickness / MARK_R).toBeLessThanOrEqual(0.45);
    expect(spec.gap).toBeGreaterThan(3);
    expect(spec.gap).toBeLessThan(8);
    expect(spec.rightTip.x).toBeCloseTo(-spec.leftTip.x);
    expect(spec.rightTip.y).toBeCloseTo(spec.leftTip.y);
    expect(spec.rightTip.y).toBeGreaterThan(spec.radius * 0.2);
    expect(spec.rightTip.x).toBeGreaterThan(spec.radius + 8);
    expect(spec.apex.x).toBeCloseTo(0);
    expect(spec.apex.y).toBeCloseTo(spec.innerCrown.y - spec.topThickness);
    expect(spec.innerCrown.y).toBeCloseTo(-(spec.radius + spec.gap));
    expect(Math.hypot(spec.rightTip.x, spec.rightTip.y - spec.innerCenterY)).toBeCloseTo(spec.innerR);
    expect(Math.hypot(0, spec.innerCrown.y - spec.innerCenterY)).toBeCloseTo(spec.innerR);
    expect(Math.hypot(spec.rightTip.x, spec.rightTip.y - spec.outerCenterY)).toBeCloseTo(spec.outerR);
    expect(Math.hypot(0, spec.apex.y - spec.outerCenterY)).toBeCloseTo(spec.outerR);
    const beside = Math.hypot(spec.radius, spec.rightTip.y);
    expect(spec.rightTip.x).toBeGreaterThan(beside);
  });
});
