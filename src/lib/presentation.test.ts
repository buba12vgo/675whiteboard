import { describe, expect, it } from "vitest";
import { ATTACK_COLOR, DEFENSE_COLOR, ballBesideHolder, roleColor } from "./presentation.ts";

describe("team colors and ball seat", () => {
  it("uses one color per role", () => {
    expect(roleColor("attack", ATTACK_COLOR, DEFENSE_COLOR, "#ff00ff")).toBe(ATTACK_COLOR);
    expect(roleColor("defense", ATTACK_COLOR, DEFENSE_COLOR, "#00ff00")).toBe(DEFENSE_COLOR);
    expect(roleColor("ball", ATTACK_COLOR, DEFENSE_COLOR, "#e36a1c")).toBe("#e36a1c");
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
