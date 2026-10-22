import { describe, expect, it } from "vitest";
import { draftFromPlay, parsePlays, playFromDraft, sanitizeDraft, sanitizePlay, serializePlays } from "./schema.ts";
import type { Play } from "./types.ts";

const play: Play = {
  id: "p1",
  name: "Horn",
  category: "jugada",
  notes: "Bloqueo ciego",
  view: "half",
  court: "fiba",
  createdAt: 1,
  updatedAt: 2,
  frames: [
    {
      id: "f1",
      strokes: [
        {
          id: "s1",
          points: [{ x: 1, y: 2, p: 0.4 }],
          color: "#111",
          width: 0.1,
          style: "assist",
          cap: "arrow",
        },
      ],
      tokens: [{ id: "atk-1", kind: "attack", label: "1", color: "#0f766e", x: 10, y: 7 }],
    },
  ],
};

describe("schema", () => {
  it("round-trips an export and assigns fresh ids", () => {
    const file = serializePlays([play]);
    const parsed = parsePlays(file);
    expect(parsed).toHaveLength(1);
    expect(parsed?.[0].name).toBe("Horn");
    expect(parsed?.[0].category).toBe("jugada");
    expect(parsed?.[0].id).not.toBe("p1");
    expect(parsed?.[0].frames[0].strokes[0].style).toBe("assist");
  });

  it("rejects files without plays", () => {
    expect(parsePlays({ app: "pizarra", plays: [] })).toBeNull();
    expect(parsePlays({ nope: true })).toBeNull();
  });

  it("keeps a defender rotation on the way through a draft", () => {
    const draft = sanitizeDraft({
      version: 1,
      doc: {
        view: "half",
        frameIndex: 0,
        meta: null,
        frames: [
          {
            id: "f1",
            strokes: [],
            tokens: [
              { id: "def-2", kind: "defense", label: "X2", color: "#9a3412", x: 4, y: 5, rotation: 90 },
              { id: "def-3", kind: "defense", label: "X3", color: "#9a3412", x: 5, y: 5, rotation: -90 },
            ],
          },
        ],
      },
    });
    const tokens = draft?.frames[0].tokens ?? [];
    expect(tokens.find((token) => token.id === "def-2")?.rotation).toBe(90);
    expect(tokens.find((token) => token.id === "def-3")?.rotation).toBe(270);
    expect(tokens.find((token) => token.id === "def-2")?.color).toBe("#9a3412");
  });

  it("repaints a saved garnet defender and the old orange ball", () => {
    const draft = sanitizeDraft({
      view: "half",
      frameIndex: 0,
      meta: null,
      frames: [
        {
          id: "f1",
          strokes: [],
          tokens: [
            { id: "def-1", kind: "defense", label: "X1", color: "#6e2430", x: 1, y: 1 },
            { id: "ball", kind: "ball", label: "", color: "#e36a1c", x: 2, y: 2 },
          ],
        },
      ],
    });
    const tokens = draft?.frames[0].tokens ?? [];
    expect(tokens.find((token) => token.id === "def-1")?.color).toBe("#ea580c");
    expect(tokens.find((token) => token.id === "ball")?.color).toBe("#8a4a22");
  });

  it("reads a stored draft wrapper", () => {
    const draft = sanitizeDraft({
      version: 1,
      doc: {
        view: "full",
        frameIndex: 0,
        meta: null,
        frames: play.frames,
      },
    });
    expect(draft?.view).toBe("full");
    expect(draft?.court).toBe("fiba");
    expect(draft?.frames).toHaveLength(1);
  });

  it("keeps minibasket on the play and defaults an older file to FIBA", () => {
    const { court: _court, ...older } = play;
    expect(sanitizePlay(older)?.court).toBe("fiba");
    const mini = sanitizePlay({ ...play, court: "mini" });
    expect(mini?.court).toBe("mini");
    const draft = sanitizeDraft({
      view: "half",
      court: "mini",
      frameIndex: 0,
      meta: null,
      frames: play.frames,
    });
    expect(draft?.court).toBe("mini");
    expect(draftFromPlay(mini!).court).toBe("mini");
    expect(
      playFromDraft(draft!, { id: "a", name: "Bloqueo", category: "jugada", notes: "" }).court,
    ).toBe("mini");
  });
});
