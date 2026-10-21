import { tokensAfterMovements } from "@/lib/movement";
import { draftFromPlay } from "@/lib/schema";
import { defaultTokens } from "@/lib/tokens";
import type { CourtKind, CourtView, Draft, Frame, Play, PlayMeta, Stroke, Token } from "@/lib/types";
import { uid } from "@/lib/utils";

export type Snapshot = {
  strokes: Stroke[];
  tokens: Token[];
};

export type Hist = {
  past: Snapshot[];
  future: Snapshot[];
};

export type State = {
  doc: Draft;
  histories: Record<string, Hist>;
};

export type Action =
  | { type: "replace"; doc: Draft }
  | { type: "set-view"; view: CourtView }
  | { type: "set-court"; court: CourtKind }
  | { type: "set-meta"; meta: PlayMeta | null }
  | { type: "commit-stroke"; stroke: Stroke; replaceIds?: string[] }
  | { type: "aim-shot"; id: string; points: Stroke["points"]; snapshot: boolean }
  | { type: "erase-strokes"; ids: string[] }
  | { type: "move-token"; id: string; x: number; y: number; snapshot: boolean }
  | { type: "rotate-token"; id: string; rotation: number; snapshot: boolean }
  | { type: "remove-token"; id: string }
  | { type: "add-token"; token: Token }
  | { type: "reset-tokens" }
  | { type: "clear-strokes" }
  | { type: "undo" }
  | { type: "redo" }
  | { type: "set-frame"; index: number }
  | { type: "add-frame" }
  | { type: "delete-frame" };

const HISTORY_LIMIT = 60;

export function createInitialDoc(): Draft {
  return {
    view: "half",
    court: "fiba",
    frameIndex: 0,
    meta: null,
    frames: [{ id: uid(), strokes: [], tokens: defaultTokens() }],
  };
}

export function createState(doc = createInitialDoc()): State {
  return { doc, histories: {} };
}

export function currentFrame(state: State): Frame {
  const index = Math.min(state.doc.frames.length - 1, Math.max(0, state.doc.frameIndex));
  return state.doc.frames[index];
}

export function canUndo(state: State): boolean {
  const frame = currentFrame(state);
  return (state.histories[frame.id]?.past.length ?? 0) > 0;
}

export function canRedo(state: State): boolean {
  const frame = currentFrame(state);
  return (state.histories[frame.id]?.future.length ?? 0) > 0;
}

function withFrame(state: State, frameId: string, next: Frame, record: boolean): State {
  const current = state.doc.frames.find((frame) => frame.id === frameId);
  if (!current) return state;
  let histories = state.histories;
  if (record) {
    const hist = histories[frameId] ?? { past: [], future: [] };
    histories = {
      ...histories,
      [frameId]: {
        past: [...hist.past, { strokes: current.strokes, tokens: current.tokens }].slice(-HISTORY_LIMIT),
        future: [],
      },
    };
  }
  return {
    doc: {
      ...state.doc,
      frames: state.doc.frames.map((frame) => (frame.id === frameId ? next : frame)),
    },
    histories,
  };
}

export function docSignature(doc: Draft): string {
  return JSON.stringify({ view: doc.view, court: doc.court, frames: doc.frames });
}

export function signatureOfPlay(play: Play): string {
  return docSignature(draftFromPlay(play));
}

export function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "replace":
      return createState(action.doc);
    case "set-view":
      if (state.doc.view === action.view) return state;
      return { ...state, doc: { ...state.doc, view: action.view } };
    case "set-court":
      if (state.doc.court === action.court) return state;
      return { ...state, doc: { ...state.doc, court: action.court } };
    case "set-meta":
      return { ...state, doc: { ...state.doc, meta: action.meta } };
    case "commit-stroke": {
      if (action.stroke.points.length === 0) return state;
      const frame = currentFrame(state);
      const drop = new Set(action.replaceIds ?? []);
      const kept = drop.size ? frame.strokes.filter((stroke) => !drop.has(stroke.id)) : frame.strokes;
      return withFrame(state, frame.id, { ...frame, strokes: [...kept, action.stroke] }, true);
    }
    case "aim-shot": {
      if (action.points.length < 2) return state;
      const frame = currentFrame(state);
      const stroke = frame.strokes.find((item) => item.id === action.id);
      if (!stroke || stroke.style !== "shot") return state;
      const same =
        stroke.points.length === action.points.length &&
        stroke.points.every((point, index) => point.x === action.points[index].x && point.y === action.points[index].y);
      if (same) return state;
      const strokes = frame.strokes.map((item) => (item.id === action.id ? { ...item, points: action.points } : item));
      return withFrame(state, frame.id, { ...frame, strokes }, action.snapshot);
    }
    case "erase-strokes": {
      if (action.ids.length === 0) return state;
      const frame = currentFrame(state);
      const ids = new Set(action.ids);
      const strokes = frame.strokes.filter((stroke) => !ids.has(stroke.id));
      if (strokes.length === frame.strokes.length) return state;
      return withFrame(state, frame.id, { ...frame, strokes }, true);
    }
    case "move-token": {
      const frame = currentFrame(state);
      const token = frame.tokens.find((item) => item.id === action.id);
      if (!token) return state;
      if (token.x === action.x && token.y === action.y) return state;
      const tokens = frame.tokens.map((item) =>
        item.id === action.id ? { ...item, x: action.x, y: action.y } : item,
      );
      return withFrame(state, frame.id, { ...frame, tokens }, action.snapshot);
    }
    case "rotate-token": {
      const frame = currentFrame(state);
      const token = frame.tokens.find((item) => item.id === action.id);
      if (!token || token.kind !== "defense") return state;
      const rotation = ((action.rotation % 360) + 360) % 360;
      if ((token.rotation ?? 0) === rotation) return state;
      const tokens = frame.tokens.map((item) => (item.id === action.id ? { ...item, rotation } : item));
      return withFrame(state, frame.id, { ...frame, tokens }, action.snapshot);
    }
    case "remove-token": {
      const frame = currentFrame(state);
      if (!frame.tokens.some((token) => token.id === action.id)) return state;
      return withFrame(
        state,
        frame.id,
        { ...frame, tokens: frame.tokens.filter((token) => token.id !== action.id) },
        true,
      );
    }
    case "add-token": {
      const frame = currentFrame(state);
      if (frame.tokens.some((token) => token.id === action.token.id)) return state;
      return withFrame(state, frame.id, { ...frame, tokens: [...frame.tokens, action.token] }, true);
    }
    case "reset-tokens": {
      const frame = currentFrame(state);
      return withFrame(state, frame.id, { ...frame, tokens: defaultTokens() }, true);
    }
    case "clear-strokes": {
      const frame = currentFrame(state);
      if (frame.strokes.length === 0) return state;
      return withFrame(state, frame.id, { ...frame, strokes: [] }, true);
    }
    case "undo": {
      const frame = currentFrame(state);
      const hist = state.histories[frame.id];
      if (!hist || hist.past.length === 0) return state;
      const previous = hist.past[hist.past.length - 1];
      const current: Snapshot = { strokes: frame.strokes, tokens: frame.tokens };
      return {
        doc: {
          ...state.doc,
          frames: state.doc.frames.map((item) =>
            item.id === frame.id ? { ...item, strokes: previous.strokes, tokens: previous.tokens } : item,
          ),
        },
        histories: {
          ...state.histories,
          [frame.id]: {
            past: hist.past.slice(0, -1),
            future: [...hist.future, current],
          },
        },
      };
    }
    case "redo": {
      const frame = currentFrame(state);
      const hist = state.histories[frame.id];
      if (!hist || hist.future.length === 0) return state;
      const next = hist.future[hist.future.length - 1];
      const current: Snapshot = { strokes: frame.strokes, tokens: frame.tokens };
      return {
        doc: {
          ...state.doc,
          frames: state.doc.frames.map((item) =>
            item.id === frame.id ? { ...item, strokes: next.strokes, tokens: next.tokens } : item,
          ),
        },
        histories: {
          ...state.histories,
          [frame.id]: {
            past: [...hist.past, current],
            future: hist.future.slice(0, -1),
          },
        },
      };
    }
    case "set-frame": {
      const index = Math.min(state.doc.frames.length - 1, Math.max(0, action.index));
      if (index === state.doc.frameIndex) return state;
      return { ...state, doc: { ...state.doc, frameIndex: index } };
    }
    case "add-frame": {
      const frame = currentFrame(state);
      const next: Frame = {
        id: uid(),
        strokes: [],
        tokens: tokensAfterMovements(frame.tokens, frame.strokes),
      };
      const index = state.doc.frameIndex;
      const frames = [...state.doc.frames.slice(0, index + 1), next, ...state.doc.frames.slice(index + 1)];
      return {
        ...state,
        doc: { ...state.doc, frames, frameIndex: index + 1 },
      };
    }
    case "delete-frame": {
      if (state.doc.frames.length <= 1) return state;
      const index = state.doc.frameIndex;
      const removed = state.doc.frames[index];
      const frames = state.doc.frames.filter((frame) => frame.id !== removed.id);
      const histories = { ...state.histories };
      delete histories[removed.id];
      return {
        doc: {
          ...state.doc,
          frames,
          frameIndex: Math.min(index, frames.length - 1),
        },
        histories,
      };
    }
    default:
      return state;
  }
}
