import { describe, expect, it } from "vitest";
import { easeInOut } from "./utils.ts";
import { PLAY_HOLD_MS, PLAY_MOVE_MS, interpolateTokens, lerpAngle, playbackLanding } from "./playback.ts";
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

  it("plays each step once, slower, and stops on the last frame", () => {
    expect(PLAY_MOVE_MS).toBe(1760);
    expect(PLAY_HOLD_MS).toBeGreaterThanOrEqual(400);
    expect(PLAY_HOLD_MS).toBeLessThan(PLAY_MOVE_MS);
    expect(playbackLanding(0, 4)).toEqual({ index: 1, done: false });
    expect(playbackLanding(1, 4)).toEqual({ index: 2, done: false });
    expect(playbackLanding(2, 4)).toEqual({ index: 3, done: true });
    expect(playbackLanding(0, 2)).toEqual({ index: 1, done: true });
    expect(playbackLanding(3, 4).index).not.toBe(0);
  });

  it("fades tokens that leave the next step", () => {
    const faded = interpolateTokens([a], [], 0.25);
    expect(faded[0].opacity).toBeCloseTo(0.75);
  });
});
