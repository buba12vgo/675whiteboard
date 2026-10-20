import { describe, expect, it } from "vitest";
import {
  BASKET_INSET,
  COURT_WIDTH,
  THREE_CORNER,
  THREE_DX,
  THREE_RADIUS,
  fitCourt,
} from "./geometry.ts";

describe("fitCourt", () => {
  it("maps half-court baselines to the top edge", () => {
    const transform = fitCourt("half", 1500, 1400, 0);
    const origin = transform.toScreen(0, 0);
    const far = transform.toScreen(14, 15);
    expect(origin.x).toBeCloseTo(transform.rect.x, 0);
    expect(origin.y).toBeCloseTo(transform.rect.y, 0);
    expect(far.x).toBeCloseTo(transform.rect.x + transform.rect.w, 0);
    expect(far.y).toBeCloseTo(transform.rect.y + transform.rect.h, 0);
    const back = transform.toCourt(origin.x, origin.y);
    expect(back.x).toBeCloseTo(0, 5);
    expect(back.y).toBeCloseTo(0, 5);
  });

  it("keeps a round trip on the full court", () => {
    const wide = fitCourt("full", 1866, 1000, 12);
    expect(wide.orientation).toBe("length-x");
    const point = wide.toScreen(18.25, 4.5);
    const court = wide.toCourt(point.x, point.y);
    expect(court.x).toBeCloseTo(18.25, 4);
    expect(court.y).toBeCloseTo(4.5, 4);

    const tall = fitCourt("full", 800, 1600, 12);
    expect(tall.orientation).toBe("length-y");
  });

  it("joins the FIBA three-point arc to the corner line", () => {
    const y = THREE_CORNER;
    const x = BASKET_INSET + THREE_DX;
    const dx = x - BASKET_INSET;
    const dy = y - COURT_WIDTH / 2;
    expect(Math.hypot(dx, dy)).toBeCloseTo(THREE_RADIUS, 6);
    expect(THREE_DX).toBeGreaterThan(1.4);
    expect(THREE_DX).toBeLessThan(1.5);
  });
});
