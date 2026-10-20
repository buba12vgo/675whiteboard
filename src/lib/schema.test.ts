import { describe, expect, it } from "vitest";
import { parsePlays, sanitizeDraft, serializePlays } from "./schema.ts";
import type { Play } from "./types.ts";

const play: Play = {
  id: "p1",
  name: "Horn",
  category: "jugada",
  notes: "Bloqueo ciego",
  view: "half",
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
          style: "shot",
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
    expect(parsed?.[0].frames[0].strokes[0].style).toBe("shot");
  });

  it("rejects files without plays", () => {
    expect(parsePlays({ app: "pizarra", plays: [] })).toBeNull();
    expect(parsePlays({ nope: true })).toBeNull();
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
    expect(draft?.frames).toHaveLength(1);
  });
});
