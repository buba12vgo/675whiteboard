import { describe, expect, it } from "vitest";
import { BALL_FILL } from "./defense-mark.ts";
import { ATTACK_COLOR, DEFENSE_COLOR, LEGACY_DEFENSE_COLOR, ROLE_SWATCHES, ballBesideHolder, isRoleColor, roleColor } from "./presentation.ts";

function contrast(hex: string, other: string): number {
  const lin = (channel: number) => {
    const c = channel / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const lum = (value: string) => {
    const n = Number.parseInt(value.slice(1), 16);
    const r = lin((n >> 16) & 255);
    const g = lin((n >> 8) & 255);
    const b = lin(n & 255);
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const a = lum(hex);
  const b = lum(other);
  const [hi, lo] = a > b ? [a, b] : [b, a];
  return (hi + 0.05) / (lo + 0.05);
}

describe("team colors and ball seat", () => {
  it("uses one color per role", () => {
    expect(roleColor("attack", ATTACK_COLOR, DEFENSE_COLOR, "#ff00ff")).toBe(ATTACK_COLOR);
    expect(roleColor("defense", ATTACK_COLOR, DEFENSE_COLOR, "#00ff00")).toBe(DEFENSE_COLOR);
    expect(roleColor("ball", ATTACK_COLOR, DEFENSE_COLOR, BALL_FILL)).toBe(BALL_FILL);
  });

  it("paints defense in the accent orange and keeps the white number readable", () => {
    expect(DEFENSE_COLOR).toBe("#ea580c");
    expect(ROLE_SWATCHES.some((swatch) => swatch.value === DEFENSE_COLOR)).toBe(true);
    expect(isRoleColor(LEGACY_DEFENSE_COLOR)).toBe(false);
    expect(contrast("#ffffff", DEFENSE_COLOR)).toBeGreaterThan(3);
    expect(BALL_FILL).not.toBe(DEFENSE_COLOR);
    expect(contrast(BALL_FILL, "#f4efe4")).toBeGreaterThan(4);
  });

  it("seats the ball on the holder's lower right, touching the ring", () => {
    const id = (x: number, y: number) => ({ x, y });
    const seat = ballBesideHolder({ x: 0, y: 0 }, id, id, 40, 16);
    expect(seat.x).toBeGreaterThan(0);
    expect(seat.y).toBeGreaterThan(0);
    const dist = Math.hypot(seat.x, seat.y);
    expect(dist).toBeGreaterThan(20);
    expect(dist).toBeLessThan(20 + 8);
  });
});
