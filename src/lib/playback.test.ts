import { describe, expect, it } from "vitest";
import { easeInOut } from "./utils.ts";
import { interpolateTokens, lerpAngle } from "./playback.ts";
import type { Token } from "./types.ts";

const a: Token = { id: "atk-1", kind: "attack", label: "1", color: "#000", x: 0, y: 0 };
const b: Token = { ...a, x: 10, y: 4 };

describe("playback", () => {
  it("eases the middle slower than the start", () => {
    expect(easeInOut(0)).toBe(0);
    expect(easeInOut(1)).toBe(1);
    expect(easeInOut(0.5)).toBeCloseTo(0.5);
  });

  it("slides a token toward the next step", () => {
    const mid = interpolateTokens([a], [b], 0.5);
    expect(mid[0].x).toBeCloseTo(5);
    expect(mid[0].y).toBeCloseTo(2);
    expect(mid[0].opacity).toBe(1);
  });

  it("turns a defender the short way", () => {
    expect(lerpAngle(350, 10, 0.5)).toBeCloseTo(0);
    expect(lerpAngle(10, 350, 0.5)).toBeCloseTo(0);
  });

  it("fades tokens that leave the next step", () => {
    const faded = interpolateTokens([a], [], 0.25);
    expect(faded[0].opacity).toBeCloseTo(0.75);
  });
});
