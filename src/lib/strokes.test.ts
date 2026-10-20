import { describe, expect, it } from "vitest";
import { hitTestStroke, resample, simplifyPoints, wavePoints, zigzagPoints } from "./strokes.ts";
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

  it("waves a shot off the line and keeps both ends", () => {
    const points = wavePoints(
      [
        { x: 0, y: 0 },
        { x: 12, y: 0 },
      ],
      1.5,
      1,
    );
    expect(points[0]).toEqual({ x: 0, y: 0 });
    expect(points.at(-1)).toEqual({ x: 12, y: 0 });
    const offset = points.slice(1, -1).some((point) => Math.abs(point.y) > 0.4);
    expect(offset).toBe(true);
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
