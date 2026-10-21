import {
  arcPoints,
  BASKET_INSET,
  COURT_LENGTH,
  COURT_WIDTH,
  KEY_LENGTH,
  KEY_WIDTH,
  LINE_WIDTH,
  THREE_ALPHA,
  THREE_CORNER,
  THREE_DX,
  THREE_RADIUS,
  type CourtTransform,
  type Meter,
} from "@/lib/geometry";
import { isLightColor } from "@/lib/utils";

const LINE = "#173454";

export const COURT_FLOORS = [
  { id: "parquet-light", label: "Parquet claro" },
  { id: "parquet-dark", label: "Parquet oscuro" },
  { id: "light", label: "Claro" },
  { id: "dark", label: "Oscuro" },
  { id: "flat", label: "Color plano" },
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

export function courtInk(floor: CourtFloor, flatColor: string): { line: string; lane: string } {
  const dark =
    floor === "dark" || floor === "parquet-dark" || (floor === "flat" && !isLightColor(flatColor));
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

/** Closed rectangular lane. No rim, no free-throw circle, no hash marks. */
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

function drawParquet(ctx: CanvasRenderingContext2D, transform: CourtTransform, tone: "light" | "dark") {
  const colors =
    tone === "light"
      ? ["#f3ddb4", "#e8c48c", "#f7e4c4", "#deb67a", "#efd0a0"]
      : ["#6e4524", "#593618", "#7c5230", "#4c3016", "#62401f"];
  const { visible } = transform;
  const plank = 0.12;
  const board = 2.2;
  let index = 0;
  for (let y = visible.y0; y < visible.y1 - 0.001; y += plank) {
    const yb = Math.min(visible.y1, y + plank);
    const shift = index % 2 === 0 ? 0 : board / 2;
    const color = colors[index % colors.length];
    for (let x = visible.x0 - shift; x < visible.x1; x += board) {
      const a = Math.max(visible.x0, x);
      const b = Math.min(visible.x1, x + board);
      if (b - a > 0.02) fillBoard(ctx, transform, a, y, b, yb, color);
    }
    index += 1;
  }
}

function drawThree(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right", line: string) {
  const sign = side === "left" ? 1 : -1;
  const baseline = baselineOf(side);
  const basketX = side === "left" ? BASKET_INSET : COURT_LENGTH - BASKET_INSET;
  const midY = COURT_WIDTH / 2;
  const cornerY0 = THREE_CORNER;
  const cornerY1 = COURT_WIDTH - THREE_CORNER;
  const arcX = basketX + sign * THREE_DX;
  strokeMeters(ctx, transform, [
    { x: baseline, y: cornerY0 },
    { x: arcX, y: cornerY0 },
  ], { color: line });
  strokeMeters(ctx, transform, [
    { x: baseline, y: cornerY1 },
    { x: arcX, y: cornerY1 },
  ], { color: line });
  const a0 = side === "left" ? -THREE_ALPHA : Math.PI - THREE_ALPHA;
  const a1 = side === "left" ? THREE_ALPHA : Math.PI + THREE_ALPHA;
  strokeMeters(ctx, transform, arcPoints(basketX, midY, THREE_RADIUS, a0, a1, 56), { color: line });
}

export type CourtPaint = {
  three: boolean;
  floor: CourtFloor;
  flatColor: string;
};

const DEFAULT_PAINT: CourtPaint = { three: true, floor: "parquet-light", flatColor: FLAT_COLORS[0].value };

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
    drawLane(ctx, transform, side, ink);
    if (paint.three) drawThree(ctx, transform, side, ink.line);
  }

  if (transform.view === "full") {
    const mid = COURT_LENGTH / 2;
    strokeMeters(ctx, transform, [
      { x: mid, y: 0 },
      { x: mid, y: COURT_WIDTH },
    ], { color: ink.line });
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
