import { describe, expect, it } from "vitest";
import {
  BACKBOARD_INSET,
  BASKET_INSET,
  COURT_WIDTH,
  KEY_LENGTH,
  KEY_WIDTH,
  THREE_CORNER,
  THREE_CORNER_FROM_BASKET,
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

  it("uses the current FIBA lines: 6.75 arc, 6.60 corners, 4.90 lane, 5.80 free throw", () => {
    expect(THREE_RADIUS).toBe(6.75);
    expect(THREE_CORNER).toBe(0.9);
    expect(THREE_CORNER_FROM_BASKET).toBeCloseTo(6.6);
    expect(KEY_WIDTH).toBe(4.9);
    expect(KEY_LENGTH).toBe(5.8);
    expect(BASKET_INSET).toBe(1.575);
    expect(BACKBOARD_INSET).toBe(1.2);
    const y = THREE_CORNER;
    const x = BASKET_INSET + THREE_DX;
    const dx = x - BASKET_INSET;
    const dy = y - COURT_WIDTH / 2;
    expect(Math.hypot(dx, dy)).toBeCloseTo(THREE_RADIUS, 6);
    expect(Math.abs(dy)).toBeCloseTo(6.6, 6);
    expect(THREE_DX).toBeGreaterThan(1.4);
    expect(THREE_DX).toBeLessThan(1.5);
  });
});
