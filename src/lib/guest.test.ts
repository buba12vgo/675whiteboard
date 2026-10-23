import { describe, expect, it } from "vitest";
import { chooseGuest, clearGuest, guestChosen } from "./guest.ts";

function memory() {
  const values = new Map<string, string>();
  return {
    getItem: (key: string) => values.get(key) ?? null,
    setItem: (key: string, value: string) => values.set(key, value),
    removeItem: (key: string) => values.delete(key),
  };
}

describe("guest mode", () => {
  it("remembers the choice to work without an account", () => {
    const box = memory();
    expect(guestChosen(box)).toBe(false);
    chooseGuest(box);
    expect(guestChosen(box)).toBe(true);
    clearGuest(box);
    expect(guestChosen(box)).toBe(false);
  });
});
