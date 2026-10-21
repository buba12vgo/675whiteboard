import { describe, expect, it } from "vitest";
import { assistPoints, hitTestStroke, offsetPolyline, resample, simplifyPoints, zigzagPoints } from "./strokes.ts";
import type { Stroke } from "./types.ts";

const stroke: Stroke = {
  id: "s",
  points: [
    { x: 0, y: 0, p: 0.5 },
    { x: 2, y: 0, p: 0.5 },
  ],
  color: "#111",
  width: 0.1,
  style: "solid",
  cap: "arrow",
};

describe("strokes", () => {
  it("hits near a segment and misses far away", () => {
    expect(hitTestStroke(stroke, 1, 0.2, 0.3)).toBe(true);
    expect(hitTestStroke(stroke, 1, 2, 0.3)).toBe(false);
  });

  it("resamples a straight run", () => {
    const points = resample(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      4,
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)?.x).toBeCloseTo(10);
    expect(points.length).toBeGreaterThan(2);
  });

  it("zigzags off the center line", () => {
    const points = zigzagPoints(
      [
        { x: 0, y: 0 },
        { x: 8, y: 0 },
      ],
      2,
      1,
    );
    expect(points.length).toBeGreaterThan(2);
    const offset = points.slice(1, -1).some((point) => Math.abs(point.y) > 0.4);
    expect(offset).toBe(true);
  });

  it("curls an assist and keeps the arrow tip", () => {
    const points = assistPoints(
      [
        { x: 0, y: 0 },
        { x: 10, y: 0 },
      ],
      1.2,
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 10, y: 0 });
    expect(points.length).toBeGreaterThan(4);
    expect(points.some((point) => Math.abs(point.y) > 0.4)).toBe(true);
  });

  it("offsets a shot into two parallel lines", () => {
    const line = [
      { x: 0, y: 0 },
      { x: 12, y: 0 },
    ];
    const upper = offsetPolyline(line, 1);
    const lower = offsetPolyline(line, -1);
    expect(upper[0].x).toBeCloseTo(0);
    expect(upper.at(-1)?.x).toBeCloseTo(12);
    expect(upper[0].y).toBeCloseTo(1);
    expect(lower[0].y).toBeCloseTo(-1);
    expect(upper[0].y - lower[0].y).toBeCloseTo(2);
  });

  it("simplifies a straight stroke to the ends", () => {
    const simplified = simplifyPoints(
      [
        { x: 0, y: 0, p: 0.4 },
        { x: 1, y: 0, p: 0.4 },
        { x: 2, y: 0, p: 0.4 },
        { x: 3, y: 0, p: 0.4 },
      ],
      0.01,
    );
    expect(simplified).toHaveLength(2);
  });
});
