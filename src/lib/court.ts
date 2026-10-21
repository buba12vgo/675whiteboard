import {
  arcPoints,
  BACKBOARD_INSET,
  BASKET_INSET,
  CENTER_RADIUS,
  COURT_LENGTH,
  COURT_WIDTH,
  KEY_LENGTH,
  KEY_WIDTH,
  LINE_WIDTH,
  miniFreeThrowArc,
  miniLayout,
  miniTicks,
  RIM_RADIUS,
  THREE_ALPHA,
  THREE_CORNER,
  THREE_DX,
  THREE_RADIUS,
  type CourtTransform,
  type Meter,
} from "@/lib/geometry";
import type { CourtKind } from "@/lib/types";
import { isLightColor } from "@/lib/utils";

const LINE = "#173454";

export const COURT_FLOORS = [
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
  { id: "flat", label: "Color plano" },
  { id: "parquet-light", label: "Parquet claro" },
  { id: "parquet-dark", label: "Parquet oscuro" },
] as const;

export type CourtFloor = (typeof COURT_FLOORS)[number]["id"];

export const FLAT_COLORS = [
  { id: "azul", label: "Azul", value: "#1d4e89" },
  { id: "verde", label: "Verde", value: "#1f7a4d" },
  { id: "rojo", label: "Rojo", value: "#9b2335" },
  { id: "naranja", label: "Naranja", value: "#e07a2f" },
  { id: "crema", label: "Crema", value: "#f6f1e6" },
  { id: "negro", label: "Negro", value: "#1a2332" },
];

const FLOOR_IDS = new Set<string>(COURT_FLOORS.map((item) => item.id));

export function isCourtFloor(value: unknown): value is CourtFloor {
  return typeof value === "string" && FLOOR_IDS.has(value);
}

/** Bump when the automatic floor default changes, so a saved parquet start opens on cream. */
export const FLOOR_DEFAULT_VERSION = 2;

export function resolveFloorSetting(parsed: { floor?: unknown; floorVersion?: unknown }): {
  floor: CourtFloor;
  floorVersion: number;
} {
  const version = typeof parsed.floorVersion === "number" && Number.isFinite(parsed.floorVersion) ? parsed.floorVersion : 0;
  const stored = isCourtFloor(parsed.floor) ? parsed.floor : null;
  if (version < FLOOR_DEFAULT_VERSION) {
    return {
      floor: stored && stored !== "parquet-light" ? stored : "light",
      floorVersion: FLOOR_DEFAULT_VERSION,
    };
  }
  return { floor: stored ?? "light", floorVersion: version };
}

export function courtInk(floor: CourtFloor, flatColor: string): { line: string; lane: string } {
  if (floor === "parquet-light") return { line: "#f7f4ee", lane: "#3b87c9" };
  if (floor === "parquet-dark") return { line: "#f4efe4", lane: "#1e568f" };
  const dark = floor === "dark" || (floor === "flat" && !isLightColor(flatColor));
  return dark
    ? { line: "#f4efe4", lane: "rgba(255,255,255,0.12)" }
    : { line: LINE, lane: "rgba(23, 52, 84, 0.1)" };
}

function trace(ctx: CanvasRenderingContext2D, transform: CourtTransform, points: Meter[]) {
  const first = transform.toScreen(points[0].x, points[0].y);
  ctx.beginPath();
  ctx.moveTo(first.x, first.y);
  for (let i = 1; i < points.length; i += 1) {
    const p = transform.toScreen(points[i].x, points[i].y);
    ctx.lineTo(p.x, p.y);
  }
}

function strokeMeters(
  ctx: CanvasRenderingContext2D,
  transform: CourtTransform,
  points: Meter[],
  options?: { dash?: number[]; width?: number; color?: string },
) {
  if (points.length < 2) return;
  trace(ctx, transform, points);
  ctx.strokeStyle = options?.color ?? LINE;
  ctx.lineWidth = options?.width ?? Math.max(1.6, LINE_WIDTH * transform.scale);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.setLineDash((options?.dash ?? []).map((d) => d * transform.scale));
  ctx.stroke();
  ctx.setLineDash([]);
}

function fillMeters(ctx: CanvasRenderingContext2D, transform: CourtTransform, points: Meter[], color: string) {
  if (points.length < 3) return;
  trace(ctx, transform, points);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

function baselineOf(side: "left" | "right") {
  return side === "left" ? 0 : COURT_LENGTH;
}

function sideOnCourt(transform: CourtTransform, side: "left" | "right") {
  const x = baselineOf(side);
  return x >= transform.visible.x0 - 0.2 && x <= transform.visible.x1 + 0.2;
}

/** Closed rectangular lane. No free-throw circle and no hash marks. */
function drawLane(
  ctx: CanvasRenderingContext2D,
  transform: CourtTransform,
  side: "left" | "right",
  ink: { line: string; lane: string },
) {
  const baseline = baselineOf(side);
  const midY = COURT_WIDTH / 2;
  const laneHalf = KEY_WIDTH / 2;
  const keyEnd = side === "left" ? KEY_LENGTH : COURT_LENGTH - KEY_LENGTH;
  const lane = [
    { x: baseline, y: midY - laneHalf },
    { x: keyEnd, y: midY - laneHalf },
    { x: keyEnd, y: midY + laneHalf },
    { x: baseline, y: midY + laneHalf },
  ];
  fillMeters(ctx, transform, lane, ink.lane);
  strokeMeters(ctx, transform, lane, { color: ink.line });
}

function fillBoard(
  ctx: CanvasRenderingContext2D,
  transform: CourtTransform,
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  color: string,
) {
  const a = transform.toScreen(x0, y0);
  const b = transform.toScreen(x1, y0);
  const c = transform.toScreen(x1, y1);
  const d = transform.toScreen(x0, y1);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.lineTo(c.x, c.y);
  ctx.lineTo(d.x, d.y);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
}

/** Long strips along the court length, close in tone but distinct enough to read as boards. */
const LIGHT_BOARDS = ["#e7d4b6", "#f3e6d0", "#dcc6a6", "#efe0c8", "#c9ae8c", "#e8d5b8", "#f6eee2", "#d4b898"];
const DARK_BOARDS = ["#6b4630", "#543828", "#7a5340", "#4a3120", "#62422e", "#3e291c", "#70503a", "#5c4030"];

function drawParquet(ctx: CanvasRenderingContext2D, transform: CourtTransform, tone: "light" | "dark") {
  const boards = tone === "light" ? LIGHT_BOARDS : DARK_BOARDS;
  const seam = tone === "light" ? "#b89a78" : "#2e2016";
  const { visible } = transform;
  const plank = 0.16;
  const yStart = Math.floor(visible.y0 / plank) * plank;
  let index = Math.round(yStart / plank);
  for (let y = yStart; y < visible.y1 - 0.001; y += plank) {
    const y0 = Math.max(visible.y0, y);
    const y1 = Math.min(visible.y1, y + plank);
    const color = boards[((index % boards.length) + boards.length) % boards.length];
    if (y1 - y0 > 0.004) fillBoard(ctx, transform, visible.x0, y0, visible.x1, y1, color);
    index += 1;
  }
  ctx.strokeStyle = seam;
  ctx.lineWidth = Math.max(1, transform.scale * 0.015);
  ctx.lineCap = "butt";
  for (let y = yStart + plank; y < visible.y1; y += plank) {
    const a = transform.toScreen(visible.x0, y);
    const b = transform.toScreen(visible.x1, y);
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  }
}

/** Backboard, neck and rim. The baseline is at the top of a half court. */
function drawBasket(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right", line: string) {
  const sign = side === "left" ? 1 : -1;
  const baseline = baselineOf(side);
  const mid = COURT_WIDTH / 2;
  const face = baseline + sign * BACKBOARD_INSET;
  const outer = face - sign * 0.16;
  const half = 0.9;
  fillBoard(ctx, transform, Math.min(face, outer), mid - half, Math.max(face, outer), mid + half, line);
  const rimX = baseline + sign * BASKET_INSET;
  const neckEnd = rimX - sign * RIM_RADIUS;
  fillBoard(ctx, transform, Math.min(face, neckEnd), mid - 0.07, Math.max(face, neckEnd), mid + 0.07, line);
  const center = transform.toScreen(rimX, mid);
  ctx.beginPath();
  ctx.arc(center.x, center.y, RIM_RADIUS * transform.scale, 0, Math.PI * 2);
  ctx.strokeStyle = line;
  ctx.lineWidth = Math.max(2, LINE_WIDTH * transform.scale * 1.2);
  ctx.stroke();
}

/**
 * Minibasket end: 8 m rectangle to the free-throw line, 4.90 m lane inside it,
 * semicircle beyond that line, and 100 mm rebound ticks. No 6.75 arc.
 */
function drawMini(
  ctx: CanvasRenderingContext2D,
  transform: CourtTransform,
  side: "left" | "right",
  ink: { line: string; lane: string },
) {
  const layout = miniLayout(side);
  const lane = [
    { x: layout.baseline, y: layout.laneY[0] },
    { x: layout.front, y: layout.laneY[0] },
    { x: layout.front, y: layout.laneY[1] },
    { x: layout.baseline, y: layout.laneY[1] },
  ];
  fillMeters(ctx, transform, lane, ink.lane);
  const box = [
    { x: layout.baseline, y: layout.boxY[0] },
    { x: layout.front, y: layout.boxY[0] },
    { x: layout.front, y: layout.boxY[1] },
    { x: layout.baseline, y: layout.boxY[1] },
  ];
  strokeMeters(ctx, transform, [...box, box[0]], { color: ink.line });
  strokeMeters(ctx, transform, [lane[0], lane[1]], { color: ink.line });
  strokeMeters(ctx, transform, [lane[3], lane[2]], { color: ink.line });
  for (const tick of miniTicks(side)) strokeMeters(ctx, transform, tick, { color: ink.line });
  strokeMeters(ctx, transform, miniFreeThrowArc(side), { color: ink.line });
}

/** One FIBA three-point line: corner straights parallel to the sideline, then the 6.75 m arc. */
function drawThree(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right", line: string) {
  const baseline = baselineOf(side);
  const basketX = side === "left" ? BASKET_INSET : COURT_LENGTH - BASKET_INSET;
  const midY = COURT_WIDTH / 2;
  const cornerY0 = THREE_CORNER;
  const cornerY1 = COURT_WIDTH - THREE_CORNER;
  const arcX = basketX + (side === "left" ? THREE_DX : -THREE_DX);
  const a0 = side === "left" ? -THREE_ALPHA : Math.PI - THREE_ALPHA;
  const a1 = side === "left" ? THREE_ALPHA : Math.PI + THREE_ALPHA;
  const arc = arcPoints(basketX, midY, THREE_RADIUS, a0, a1, 72);
  if (arc[0].y > arc[arc.length - 1].y) arc.reverse();
  strokeMeters(
    ctx,
    transform,
    [{ x: baseline, y: cornerY0 }, { x: arcX, y: cornerY0 }, ...arc, { x: arcX, y: cornerY1 }, { x: baseline, y: cornerY1 }],
    { color: line },
  );
}

export type CourtPaint = {
  court: CourtKind;
  floor: CourtFloor;
  flatColor: string;
};

const DEFAULT_PAINT: CourtPaint = { court: "fiba", floor: "light", flatColor: FLAT_COLORS[0].value };

export function drawCourt(ctx: CanvasRenderingContext2D, transform: CourtTransform, paint: CourtPaint = DEFAULT_PAINT) {
  const { rect, scale } = transform;
  const canvas = ctx.canvas;
  const transformNow = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(transformNow);

  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  const ink = courtInk(paint.floor, paint.flatColor);
  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  if (paint.floor === "parquet-light" || paint.floor === "parquet-dark") {
    drawParquet(ctx, transform, paint.floor === "parquet-light" ? "light" : "dark");
  } else if (paint.floor === "dark") {
    ctx.fillStyle = "#1a2330";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else if (paint.floor === "flat") {
    ctx.fillStyle = paint.flatColor;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  } else {
    ctx.fillStyle = "#f4efe4";
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  }

  for (const side of ["left", "right"] as const) {
    if (!sideOnCourt(transform, side)) continue;
    if (paint.court === "mini") drawMini(ctx, transform, side, ink);
    else {
      drawLane(ctx, transform, side, ink);
      drawThree(ctx, transform, side, ink.line);
    }
    drawBasket(ctx, transform, side, ink.line);
  }

  if (transform.view === "full") {
    const mid = COURT_LENGTH / 2;
    strokeMeters(ctx, transform, [
      { x: mid, y: 0 },
      { x: mid, y: COURT_WIDTH },
    ], { color: ink.line });
  }

  if (paint.court === "mini") {
    const circle = arcPoints(COURT_LENGTH / 2, COURT_WIDTH / 2, CENTER_RADIUS, 0, Math.PI * 2, 72);
    strokeMeters(ctx, transform, circle, { color: ink.line });
  }

  ctx.restore();

  const border = Math.max(2, LINE_WIDTH * scale);
  ctx.strokeStyle = ink.line;
  ctx.lineWidth = border;
  ctx.lineJoin = "miter";
  ctx.strokeRect(
    rect.x + border / 2,
    rect.y + border / 2,
    rect.w - border,
    rect.h - border,
  );
}
