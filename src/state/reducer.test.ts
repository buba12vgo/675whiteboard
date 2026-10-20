import { describe, expect, it } from "vitest";
import { canRedo, canUndo, createState, currentFrame, reducer } from "./reducer.ts";

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

  it("does not delete the last frame", () => {
    const state = reducer(createState(), { type: "delete-frame" });
    expect(state.doc.frames).toHaveLength(1);
  });
});
