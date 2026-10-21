import { describe, expect, it } from "vitest";
import { canRedo, canUndo, createState, currentFrame, docSignature, reducer } from "./reducer.ts";

describe("reducer", () => {
  it("undoes and redoes a stroke", () => {
    let state = createState();
    state = reducer(state, {
      type: "commit-stroke",
      stroke: {
        id: "s",
        points: [
          { x: 1, y: 1, p: 0.5 },
          { x: 2, y: 2, p: 0.5 },
        ],
        color: "#111",
        width: 0.1,
        style: "solid",
        cap: "arrow",
      },
    });
    expect(currentFrame(state).strokes).toHaveLength(1);
    expect(canUndo(state)).toBe(true);
    state = reducer(state, { type: "undo" });
    expect(currentFrame(state).strokes).toHaveLength(0);
    expect(canRedo(state)).toBe(true);
    state = reducer(state, { type: "redo" });
    expect(currentFrame(state).strokes).toHaveLength(1);
  });

  it("replaces a shot in one step and aims it without moving players", () => {
    let state = createState();
    const before = currentFrame(state).tokens.map((token) => ({ id: token.id, x: token.x, y: token.y }));
    state = reducer(state, {
      type: "commit-stroke",
      stroke: {
        id: "old",
        points: [
          { x: 1, y: 1, p: 0.5 },
          { x: 2, y: 1, p: 0.5 },
        ],
        color: "#111",
        width: 0.1,
        style: "shot",
        cap: "none",
      },
    });
    state = reducer(state, {
      type: "commit-stroke",
      replaceIds: ["old"],
      stroke: {
        id: "next",
        points: [
          { x: 3, y: 1, p: 0.5 },
          { x: 4, y: 1, p: 0.5 },
        ],
        color: "#111",
        width: 0.1,
        style: "shot",
        cap: "none",
      },
    });
    expect(currentFrame(state).strokes.map((stroke) => stroke.id)).toEqual(["next"]);
    state = reducer(state, {
      type: "aim-shot",
      id: "next",
      points: [
        { x: 3, y: 1, p: 0.5 },
        { x: 3, y: 2, p: 0.5 },
      ],
      snapshot: true,
    });
    expect(currentFrame(state).strokes[0].points[1].y).toBe(2);
    expect(currentFrame(state).tokens.map((token) => ({ id: token.id, x: token.x, y: token.y }))).toEqual(before);
    state = reducer(state, { type: "undo" });
    expect(currentFrame(state).strokes[0].points[1].y).toBe(1);
  });

  it("adds a step and walks players to the end of movement arrows", () => {
    let state = createState();
    const mover = currentFrame(state).tokens.find((token) => token.id === "atk-1");
    if (!mover) throw new Error("missing player");
    state = reducer(state, {
      type: "commit-stroke",
      stroke: {
        id: "cut",
        points: [
          { x: mover.x, y: mover.y, p: 0.5 },
          { x: mover.x, y: mover.y + 3, p: 0.5 },
          { x: mover.x + 4, y: mover.y + 3, p: 0.5 },
        ],
        color: "#111",
        width: 0.1,
        style: "solid",
        cap: "arrow",
      },
    });
    state = reducer(state, { type: "add-frame" });
    const landed = currentFrame(state).tokens.find((token) => token.id === "atk-1");
    expect(landed?.x).toBeCloseTo(mover.x + 4);
    expect(landed?.y).toBeCloseTo(mover.y + 3);
    expect(currentFrame(state).strokes).toHaveLength(0);
  });

  it("adds a step with the same tokens and empty ink", () => {
    let state = createState();
    const before = currentFrame(state).tokens.map((token) => token.id);
    state = reducer(state, { type: "add-frame" });
    expect(state.doc.frames).toHaveLength(2);
    expect(state.doc.frameIndex).toBe(1);
    expect(currentFrame(state).strokes).toHaveLength(0);
    expect(currentFrame(state).tokens.map((token) => token.id)).toEqual(before);
  });

  it("moves a token once per drag in the history", () => {
    let state = createState();
    const id = currentFrame(state).tokens[0].id;
    const start = currentFrame(state).tokens[0].x;
    state = reducer(state, { type: "move-token", id, x: start + 1, y: 7, snapshot: true });
    state = reducer(state, { type: "move-token", id, x: start + 2, y: 7, snapshot: false });
    expect(currentFrame(state).tokens[0].x).toBeCloseTo(start + 2);
    state = reducer(state, { type: "undo" });
    expect(currentFrame(state).tokens[0].x).toBeCloseTo(start);
  });

  it("rotates a defender in one undo step", () => {
    let state = createState();
    state = reducer(state, { type: "rotate-token", id: "def-1", rotation: 90, snapshot: true });
    state = reducer(state, { type: "rotate-token", id: "def-1", rotation: 140, snapshot: false });
    expect(currentFrame(state).tokens.find((token) => token.id === "def-1")?.rotation).toBe(140);
    state = reducer(state, { type: "rotate-token", id: "atk-1", rotation: 40, snapshot: true });
    expect(currentFrame(state).tokens.find((token) => token.id === "atk-1")?.rotation).toBeUndefined();
    state = reducer(state, { type: "undo" });
    expect(currentFrame(state).tokens.find((token) => token.id === "def-1")?.rotation ?? 0).toBe(0);
  });

  it("does not delete the last frame", () => {
    const state = reducer(createState(), { type: "delete-frame" });
    expect(state.doc.frames).toHaveLength(1);
  });

  it("stores the court with the play", () => {
    let state = createState();
    expect(state.doc.court).toBe("fiba");
    const before = docSignature(state.doc);
    state = reducer(state, { type: "set-court", court: "mini" });
    expect(state.doc.court).toBe("mini");
    expect(docSignature(state.doc)).not.toBe(before);
    const signed = docSignature(state.doc);
    state = reducer(state, { type: "set-court", court: "mini" });
    expect(docSignature(state.doc)).toBe(signed);
  });
});
