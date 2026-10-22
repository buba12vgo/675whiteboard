import { BALL_FILL, LEGACY_BALL_FILL } from "@/lib/defense-mark";
import { DEFENSE_COLOR, LEGACY_DEFENSE_COLOR } from "@/lib/presentation";
import { defaultTokens } from "@/lib/tokens";
import type {
  Category,
  CourtKind,
  CourtView,
  Draft,
  Frame,
  LineCap,
  Play,
  PlayMeta,
  Point,
  Stroke,
  Token,
  TokenKind,
} from "@/lib/types";
import { EXPORT_APP, EXPORT_VERSION, isLineStyle } from "@/lib/types";
import { uid } from "@/lib/utils";

const CAPS = new Set<LineCap>(["none", "arrow", "tee"]);
const KINDS = new Set<TokenKind>(["attack", "defense", "ball", "obstacle"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function sanitizePoint(value: unknown): Point | null {
  if (!isRecord(value)) return null;
  const x = num(value.x);
  const y = num(value.y);
  const p = num(value.p);
  if (x === null || y === null) return null;
  return { x, y, p: p === null ? 0.5 : Math.min(1, Math.max(0, p)) };
}

function sanitizeStroke(value: unknown): Stroke | null {
  if (!isRecord(value)) return null;
  if (!Array.isArray(value.points)) return null;
  const points = value.points.map(sanitizePoint).filter((point): point is Point => point !== null).slice(0, 5000);
  if (points.length === 0) return null;
  const style = isLineStyle(value.style) ? value.style : "solid";
  const cap = CAPS.has(value.cap as LineCap) ? (value.cap as LineCap) : "none";
  const width = num(value.width) ?? 0.1;
  const color = str(value.color) ?? "#1a2332";
  return {
    id: str(value.id) ?? uid(),
    points,
    color,
    width: Math.min(0.5, Math.max(0.02, width)),
    style,
    cap,
  };
}

function storedTokenColor(kind: TokenKind, raw: string | null): string {
  if (kind === "defense" && (!raw || raw.toLowerCase() === LEGACY_DEFENSE_COLOR)) return DEFENSE_COLOR;
  if (kind === "ball" && (!raw || raw.toLowerCase() === LEGACY_BALL_FILL)) return BALL_FILL;
  return raw ?? "#111827";
}

function sanitizeToken(value: unknown): Token | null {
  if (!isRecord(value)) return null;
  const x = num(value.x);
  const y = num(value.y);
  const kind = KINDS.has(value.kind as TokenKind) ? (value.kind as TokenKind) : null;
  if (x === null || y === null || !kind) return null;
  const rotation = num(value.rotation);
  return {
    id: str(value.id) ?? uid(),
    kind,
    label: (str(value.label) ?? "").slice(0, 4),
    color: storedTokenColor(kind, str(value.color)),
    x,
    y,
    ...(rotation === null ? {} : { rotation: ((rotation % 360) + 360) % 360 }),
  };
}

export function sanitizeFrame(value: unknown): Frame | null {
  if (!isRecord(value)) return null;
  const strokes = Array.isArray(value.strokes)
    ? value.strokes.map(sanitizeStroke).filter((stroke): stroke is Stroke => stroke !== null)
    : [];
  const tokens = Array.isArray(value.tokens)
    ? value.tokens.map(sanitizeToken).filter((token): token is Token => token !== null)
    : defaultTokens();
  return {
    id: str(value.id) ?? uid(),
    strokes,
    tokens,
  };
}

function sanitizeCategory(value: unknown): Category {
  return value === "ejercicio" ? "ejercicio" : "jugada";
}

function sanitizeView(value: unknown): CourtView {
  return value === "full" ? "full" : "half";
}

function sanitizeCourt(value: unknown): CourtKind {
  return value === "mini" ? "mini" : "fiba";
}

export function sanitizePlay(value: unknown, freshId = false): Play | null {
  if (!isRecord(value)) return null;
  const frames = Array.isArray(value.frames)
    ? value.frames.map(sanitizeFrame).filter((frame): frame is Frame => frame !== null)
    : [];
  if (frames.length === 0) return null;
  const now = Date.now();
  const name = (str(value.name) ?? "").trim().slice(0, 80) || "Sin título";
  return {
    id: freshId ? uid() : (str(value.id) ?? uid()),
    name,
    category: sanitizeCategory(value.category),
    notes: (str(value.notes) ?? "").slice(0, 2000),
    view: sanitizeView(value.view),
    court: sanitizeCourt(value.court),
    frames,
    createdAt: num(value.createdAt) ?? now,
    updatedAt: num(value.updatedAt) ?? now,
  };
}

export function sanitizeDraft(value: unknown): Draft | null {
  if (!isRecord(value)) return null;
  const source = isRecord(value.doc) ? value.doc : value;
  if (!isRecord(source)) return null;
  const frames = Array.isArray(source.frames)
    ? source.frames.map(sanitizeFrame).filter((frame): frame is Frame => frame !== null)
    : [];
  if (frames.length === 0) return null;
  const index = num(source.frameIndex) ?? 0;
  let meta: PlayMeta | null = null;
  if (isRecord(source.meta) && str(source.meta.id) && str(source.meta.name)) {
    meta = {
      id: source.meta.id as string,
      name: (source.meta.name as string).slice(0, 80),
      category: sanitizeCategory(source.meta.category),
      notes: (str(source.meta.notes) ?? "").slice(0, 2000),
    };
  }
  return {
    view: sanitizeView(source.view),
    court: sanitizeCourt(source.court),
    frames,
    frameIndex: Math.min(frames.length - 1, Math.max(0, Math.round(index))),
    meta,
  };
}

export type ExportFile = {
  app: typeof EXPORT_APP;
  version: number;
  exportedAt: string;
  plays: Play[];
};

export function serializePlays(plays: Play[]): ExportFile {
  return {
    app: EXPORT_APP,
    version: EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    plays,
  };
}

export function parsePlays(value: unknown): Play[] | null {
  const list = Array.isArray(value) ? value : isRecord(value) && Array.isArray(value.plays) ? value.plays : null;
  if (!list) return null;
  const plays = list
    .map((item) => sanitizePlay(item, true))
    .filter((play): play is Play => play !== null);
  return plays.length > 0 ? plays : null;
}

export function draftFromPlay(play: Play): Draft {
  return {
    view: play.view,
    court: play.court,
    frames: play.frames,
    frameIndex: 0,
    meta: {
      id: play.id,
      name: play.name,
      category: play.category,
      notes: play.notes,
    },
  };
}

export function playFromDraft(draft: Draft, meta: PlayMeta, previous?: Pick<Play, "createdAt">): Play {
  const now = Date.now();
  return {
    ...meta,
    view: draft.view,
    court: draft.court,
    frames: draft.frames,
    createdAt: previous?.createdAt ?? now,
    updatedAt: now,
  };
}
