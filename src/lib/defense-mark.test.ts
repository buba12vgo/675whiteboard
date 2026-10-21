import { describe, expect, it } from "vitest";
import { defenseCrescentSpec } from "./defense-mark.ts";

describe("defender crescent", () => {
  it("is a symmetric upper arc with tips at the midline", () => {
    const spec = defenseCrescentSpec();
    expect(spec.spanDeg).toBeGreaterThanOrEqual(180);
    expect(spec.spanDeg).toBeLessThanOrEqual(200);
    expect(spec.rightTip.x).toBeCloseTo(-spec.leftTip.x);
    expect(spec.rightTip.y).toBeCloseTo(spec.leftTip.y);
    expect(spec.rightTip.y).toBeGreaterThan(0);
    expect(spec.rightTip.y).toBeLessThan(spec.innerR * 0.25);
    expect(spec.topY).toBeLessThan(-spec.innerR);
    expect(spec.lowestY).toBeLessThan(spec.innerR * 0.25);
  });
});
