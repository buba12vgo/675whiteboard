import { COURT_LENGTH, COURT_WIDTH, HALF_LENGTH, fitCourt, type CourtTransform } from "@/lib/geometry";
import type { CourtKind, CourtView, LineCap, LineStyle, Point, Stroke, Token, TokenKind } from "@/lib/types";
import { isLineStyle } from "@/lib/types";
import { clamp, fold, uid } from "@/lib/utils";

/** Portrait page, 1 unit ≈ 1 CSS pixel at zoom 1. Matches A4 (1 : √2). */
export const PAGE_W = 1000;
export const PAGE_H = 1414;
/** Page-space symbols are stored in pixels and drawn as if this many pixels were one meter. */
export const PAGE_PX_PER_M = 42;

export const SHEET_SLOTS = ["h1", "h2", "h3", "f1", "f2"] as const;
export type SheetSlot = (typeof SHEET_SLOTS)[number];

export type SheetRect = { x: number; y: number; w: number; h: number };

export type SheetSlotBox = {
  id: SheetSlot;
  view: CourtView;
  rect: SheetRect;
};

export type SheetLayout = {
  page: { w: number; h: number };
  header: SheetRect;
  notes: SheetRect;
  halves: SheetSlotBox[];
  fulls: SheetSlotBox[];
};

export type PageInk = {
  id: string;
  points: Point[];
  color: string;
  /** Width in page pixels. */
  width: number;
  style: LineStyle;
  cap: LineCap;
};

export type SlotMarks = {
  strokes: Stroke[];
  tokens: Token[];
};

export type Team = {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
};

export type Session = {
  id: string;
  title: string;
  teamId: string;
  teamName: string;
  /** Calendar day, YYYY-MM-DD. */
  date: string;
  court: CourtKind;
  ink: PageInk[];
  slots: Record<SheetSlot, SlotMarks>;
  createdAt: number;
  updatedAt: number;
};

export const INK_WIDTHS = [
  { id: "fino", label: "Fino", page: 3.6, meters: 0.1 },
  { id: "medio", label: "Medio", page: 6.2, meters: 0.16 },
  { id: "grueso", label: "Grueso", page: 10, meters: 0.26 },
] as const;

const CAPS = new Set<LineCap>(["none", "arrow", "tee"]);
const KINDS = new Set<TokenKind>(["attack", "defense", "ball", "obstacle"]);
const MARGIN = 28;
const HEADER_H = 78;
const GAP = 14;

export function sheetLayout(): SheetLayout {
  const innerW = PAGE_W - MARGIN * 2;
  const header = { x: MARGIN, y: MARGIN, w: innerW, h: HEADER_H };
  const fullW = (innerW - GAP) / 2;
  const fullH = fullW * (COURT_WIDTH / COURT_LENGTH);
  const fullY = PAGE_H - MARGIN - fullH;
  const topY = header.y + header.h + GAP;
  const topH = fullY - GAP - topY;
  const halfH = (topH - GAP * 2) / 3;
  const halfW = halfH * (COURT_WIDTH / HALF_LENGTH);
  const notesX = MARGIN + halfW + GAP;
  const notes = { x: notesX, y: topY, w: PAGE_W - MARGIN - notesX, h: topH };
  const halves = [0, 1, 2].map((index) => ({
    id: `h${index + 1}` as SheetSlot,
    view: "half" as const,
    rect: { x: MARGIN, y: topY + index * (halfH + GAP), w: halfW, h: halfH },
  }));
  const fulls = [0, 1].map((index) => ({
    id: `f${index + 1}` as SheetSlot,
    view: "full" as const,
    rect: { x: MARGIN + index * (fullW + GAP), y: fullY, w: fullW, h: fullH },
  }));
  return { page: { w: PAGE_W, h: PAGE_H }, header, notes, halves, fulls };
}

export function slotTransform(box: SheetRect, view: CourtView): CourtTransform {
  const local = fitCourt(view, box.w, box.h, 0);
  return {
    ...local,
    rect: { x: box.x + local.rect.x, y: box.y + local.rect.y, w: local.rect.w, h: local.rect.h },
    toScreen: (x, y) => {
      const point = local.toScreen(x, y);
      return { x: point.x + box.x, y: point.y + box.y };
    },
    toCourt: (sx, sy) => local.toCourt(sx - box.x, sy - box.y),
  };
}

export function allSlots(layout: SheetLayout = sheetLayout()): SheetSlotBox[] {
  return [...layout.halves, ...layout.fulls];
}

export function courtAt(x: number, y: number, layout: SheetLayout = sheetLayout()) {
  for (const slot of allSlots(layout)) {
    const transform = slotTransform(slot.rect, slot.view);
    const { rect } = transform;
    if (x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h) {
      return { slot, transform };
    }
  }
  return null;
}

export function emptySlots(): Record<SheetSlot, SlotMarks> {
  return {
    h1: { strokes: [], tokens: [] },
    h2: { strokes: [], tokens: [] },
    h3: { strokes: [], tokens: [] },
    f1: { strokes: [], tokens: [] },
    f2: { strokes: [], tokens: [] },
  };
}

export function todayISO(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function formatSessionDate(iso: string, style: "long" | "short" = "long"): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: style === "long" ? "long" : "short",
    year: "numeric",
  }).format(date);
}

export function nextJersey(tokens: Token[], kind: "attack" | "defense"): string {
  const prefix = kind === "defense" ? "X" : "";
  const labels = new Set(tokens.filter((token) => token.kind === kind).map((token) => token.label.toUpperCase()));
  for (let number = 1; number <= 5; number += 1) {
    const label = `${prefix}${number}`;
    if (!labels.has(label)) return label;
  }
  const count = tokens.filter((token) => token.kind === kind).length;
  return `${prefix}${(count % 5) + 1}`;
}

export function groupSessions(sessions: Session[]): Array<{ teamId: string; teamName: string; items: Session[] }> {
  const groups = new Map<string, { teamId: string; teamName: string; items: Session[] }>();
  for (const session of sessions) {
    const key = session.teamId || fold(session.teamName);
    const group = groups.get(key) ?? { teamId: session.teamId, teamName: session.teamName, items: [] };
    group.items.push(session);
    groups.set(key, group);
  }
  return [...groups.values()]
    .map((group) => ({
      ...group,
      items: group.items.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt),
    }))
    .sort((a, b) => a.teamName.localeCompare(b.teamName, "es"));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function str(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function colorOf(value: unknown, fallback: string): string {
  const raw = str(value);
  return raw && /^#[0-9a-fA-F]{6}$/.test(raw) ? raw.toLowerCase() : fallback;
}

function round(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function sanitizePoint(value: unknown, digits: number): Point | null {
  if (!isRecord(value)) return null;
  const x = num(value.x);
  const y = num(value.y);
  if (x === null || y === null) return null;
  const pressure = num(value.p);
  return {
    x: round(x, digits),
    y: round(y, digits),
    p: pressure === null ? 0.5 : round(clamp(pressure, 0, 1), 2),
  };
}

function sanitizePageInk(value: unknown): PageInk | null {
  if (!isRecord(value) || !Array.isArray(value.points)) return null;
  const points = value.points
    .map((point) => sanitizePoint(point, 1))
    .filter((point): point is Point => point !== null)
    .slice(0, 2000);
  if (points.length === 0) return null;
  const width = num(value.width) ?? 6;
  return {
    id: str(value.id) ?? uid(),
    points,
    color: colorOf(value.color, "#1a2332"),
    width: round(clamp(width, 0.8, 28), 2),
    style: isLineStyle(value.style) ? value.style : "solid",
    cap: CAPS.has(value.cap as LineCap) ? (value.cap as LineCap) : "none",
  };
}

function sanitizeCourtStroke(value: unknown): Stroke | null {
  if (!isRecord(value) || !Array.isArray(value.points)) return null;
  const points = value.points
    .map((point) => sanitizePoint(point, 2))
    .filter((point): point is Point => point !== null)
    .slice(0, 2000);
  if (points.length === 0) return null;
  const width = num(value.width) ?? 0.14;
  return {
    id: str(value.id) ?? uid(),
    points,
    color: colorOf(value.color, "#1a2332"),
    width: round(clamp(width, 0.02, 0.5), 3),
    style: isLineStyle(value.style) ? value.style : "solid",
    cap: CAPS.has(value.cap as LineCap) ? (value.cap as LineCap) : "arrow",
  };
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
    color: colorOf(value.color, "#17324d"),
    x: round(clamp(x, -2, 32), 2),
    y: round(clamp(y, -2, 20), 2),
    ...(rotation === null ? {} : { rotation: round(((rotation % 360) + 360) % 360, 1) }),
  };
}

function sanitizeMarks(value: unknown): SlotMarks {
  const source = isRecord(value) ? value : {};
  const strokes = Array.isArray(source.strokes)
    ? source.strokes.map(sanitizeCourtStroke).filter((stroke): stroke is Stroke => stroke !== null).slice(0, 120)
    : [];
  const tokens = Array.isArray(source.tokens)
    ? source.tokens.map(sanitizeToken).filter((token): token is Token => token !== null).slice(0, 24)
    : [];
  return { strokes, tokens };
}

export function sanitizeTeam(value: unknown): Team | null {
  if (!isRecord(value)) return null;
  const name = (str(value.name) ?? "").trim().slice(0, 80);
  const id = str(value.id) ?? "";
  if (!name || !/^[A-Za-z0-9-]{1,80}$/.test(id)) return null;
  const now = Date.now();
  const createdAt = num(value.createdAt) ?? now;
  const updatedAt = num(value.updatedAt) ?? createdAt;
  return { id, name, createdAt, updatedAt: Math.max(createdAt, updatedAt) };
}

export function sanitizeSession(value: unknown): Session | null {
  if (!isRecord(value)) return null;
  const id = str(value.id) ?? "";
  const teamId = str(value.teamId) ?? "";
  const teamName = (str(value.teamName) ?? "").trim().slice(0, 80);
  const date = str(value.date) ?? "";
  if (!/^[A-Za-z0-9-]{1,80}$/.test(id) || !/^[A-Za-z0-9-]{1,80}$/.test(teamId)) return null;
  if (!teamName || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  const title = (str(value.title) ?? "").trim().slice(0, 80) || "Sesión";
  const slots = emptySlots();
  const rawSlots = isRecord(value.slots) ? value.slots : {};
  for (const slot of SHEET_SLOTS) slots[slot] = sanitizeMarks(rawSlots[slot]);
  const ink = Array.isArray(value.ink)
    ? value.ink.map(sanitizePageInk).filter((stroke): stroke is PageInk => stroke !== null).slice(0, 400)
    : [];
  const now = Date.now();
  const createdAt = num(value.createdAt) ?? now;
  const updatedAt = num(value.updatedAt) ?? createdAt;
  return {
    id,
    title,
    teamId,
    teamName,
    date,
    court: value.court === "mini" ? "mini" : "fiba",
    ink,
    slots,
    createdAt,
    updatedAt: Math.max(createdAt, updatedAt),
  };
}

export function findTeamByName(teams: Team[], name: string): Team | undefined {
  const folded = fold(name.trim());
  if (!folded) return undefined;
  return teams.find((team) => fold(team.name) === folded);
}
