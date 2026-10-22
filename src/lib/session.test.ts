import { describe, expect, it } from "vitest";
import { COURT_LENGTH, COURT_WIDTH, HALF_LENGTH } from "./geometry.ts";
import {
  PAGE_H,
  PAGE_W,
  courtAt,
  emptySlots,
  findTeamByName,
  groupSessions,
  sanitizeSession,
  sanitizeTeam,
  sheetLayout,
  slotTransform,
  type Session,
} from "./session.ts";

function overlaps(a: { x: number; y: number; w: number; h: number }, b: { x: number; y: number; w: number; h: number }) {
  return a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
}

describe("sheet layout", () => {
  const layout = sheetLayout();

  it("stacks three half courts and two full courts on a portrait page", () => {
    expect(layout.halves).toHaveLength(3);
    expect(layout.fulls).toHaveLength(2);
    expect(layout.page).toEqual({ w: PAGE_W, h: PAGE_H });
    expect(PAGE_H / PAGE_W).toBeCloseTo(Math.SQRT2, 2);
    for (const slot of [...layout.halves, ...layout.fulls]) {
      expect(slot.rect.x).toBeGreaterThanOrEqual(24);
      expect(slot.rect.y).toBeGreaterThanOrEqual(24);
      expect(slot.rect.x + slot.rect.w).toBeLessThanOrEqual(PAGE_W - 24);
      expect(slot.rect.y + slot.rect.h).toBeLessThanOrEqual(PAGE_H - 24);
    }
    const boxes = [...layout.halves, ...layout.fulls].map((slot) => slot.rect);
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) expect(overlaps(boxes[i], boxes[j])).toBe(false);
    }
  });

  it("keeps writing space to the right of the halves and the full courts underneath", () => {
    for (const half of layout.halves) {
      expect(layout.notes.x).toBeGreaterThanOrEqual(half.rect.x + half.rect.w);
      expect(layout.notes.w).toBeGreaterThan(half.rect.w);
      expect(half.rect.w / half.rect.h).toBeCloseTo(COURT_WIDTH / HALF_LENGTH, 4);
    }
    for (const full of layout.fulls) {
      expect(full.rect.y).toBeGreaterThanOrEqual(layout.halves[2].rect.y + layout.halves[2].rect.h);
      expect(full.rect.w / full.rect.h).toBeCloseTo(COURT_LENGTH / COURT_WIDTH, 4);
    }
    expect(layout.fulls[0].rect.x).toBeLessThan(layout.fulls[1].rect.x);
  });

  it("maps each court into its own rectangle", () => {
    const hit = courtAt(layout.halves[1].rect.x + 8, layout.halves[1].rect.y + 8);
    expect(hit?.slot.id).toBe("h2");
    const notes = courtAt(layout.notes.x + layout.notes.w / 2, layout.notes.y + layout.notes.h / 2);
    expect(notes).toBeNull();
    const half = slotTransform(layout.halves[0].rect, "half");
    const origin = half.toScreen(0, 0);
    expect(origin.x).toBeCloseTo(half.rect.x, 3);
    expect(origin.y).toBeCloseTo(half.rect.y, 3);
    const back = half.toCourt(origin.x, origin.y);
    expect(back.x).toBeCloseTo(0, 3);
    expect(back.y).toBeCloseTo(0, 3);
  });
});

describe("session records", () => {
  it("drops a session without a team or a real date and caps the ink", () => {
    expect(sanitizeSession({ id: "abc", teamId: "t1", teamName: "  ", date: "2026-10-21" })).toBeNull();
    expect(sanitizeSession({ id: "abc", teamId: "t1", teamName: "Cadete", date: "21/10/2026" })).toBeNull();
    const ink = Array.from({ length: 5 }, (_, index) => ({
      id: `s${index}`,
      points: [{ x: index, y: 2, p: 0.4 }],
      color: "#1A2332",
      width: 4,
      style: "solid",
      cap: "none",
    }));
    const session = sanitizeSession({
      id: "sesion-1",
      teamId: "equipo-1",
      teamName: " Cadete A ",
      title: "",
      date: "2026-10-21",
      court: "mini",
      ink,
      createdAt: 10,
      updatedAt: 4,
    });
    expect(session?.title).toBe("Sesión");
    expect(session?.teamName).toBe("Cadete A");
    expect(session?.court).toBe("mini");
    expect(session?.ink).toHaveLength(5);
    expect(session?.ink[0].color).toBe("#1a2332");
    expect(session?.updatedAt).toBe(10);
    expect(session?.slots).toEqual(emptySlots());
  });

  it("reuses a team with the same name and groups sessions by date", () => {
    const teams = [sanitizeTeam({ id: "equipo-1", name: "Cadete", createdAt: 1, updatedAt: 1 })!];
    expect(findTeamByName(teams, " cadete ")?.id).toBe("equipo-1");
    expect(sanitizeTeam({ id: "bad id", name: "Cadete" })).toBeNull();
    const base = {
      teamName: "Cadete",
      title: "Sesión",
      court: "fiba" as const,
      ink: [],
      slots: emptySlots(),
      createdAt: 1,
      updatedAt: 1,
    };
    const sessions: Session[] = [
      { ...base, id: "a", teamId: "equipo-1", date: "2026-10-01", updatedAt: 1 },
      { ...base, id: "b", teamId: "equipo-1", date: "2026-10-20", updatedAt: 2 },
      { ...base, id: "c", teamId: "equipo-2", teamName: "Junior", date: "2026-09-01", updatedAt: 3 },
    ];
    const groups = groupSessions(sessions);
    expect(groups.map((group) => group.teamName)).toEqual(["Cadete", "Junior"]);
    expect(groups[0].items.map((item) => item.id)).toEqual(["b", "a"]);
  });
});
