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

const LINE = "#173454";

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
function drawLane(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right") {
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
  fillMeters(ctx, transform, lane, "rgba(23, 52, 84, 0.06)");
  strokeMeters(ctx, transform, lane);
}

function drawThree(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right") {
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
  ]);
  strokeMeters(ctx, transform, [
    { x: baseline, y: cornerY1 },
    { x: arcX, y: cornerY1 },
  ]);
  const a0 = side === "left" ? -THREE_ALPHA : Math.PI - THREE_ALPHA;
  const a1 = side === "left" ? THREE_ALPHA : Math.PI + THREE_ALPHA;
  strokeMeters(ctx, transform, arcPoints(basketX, midY, THREE_RADIUS, a0, a1, 56));
}

export type CourtPaint = {
  three: boolean;
};

export function drawCourt(ctx: CanvasRenderingContext2D, transform: CourtTransform, paint: CourtPaint = { three: false }) {
  const { rect, scale } = transform;
  const canvas = ctx.canvas;
  const transformNow = ctx.getTransform();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.setTransform(transformNow);

  ctx.fillStyle = "#141210";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.fillStyle = "#f6f1e6";
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

  for (const side of ["left", "right"] as const) {
    if (!sideOnCourt(transform, side)) continue;
    drawLane(ctx, transform, side);
    if (paint.three) drawThree(ctx, transform, side);
  }

  if (transform.view === "full") {
    const mid = COURT_LENGTH / 2;
    strokeMeters(ctx, transform, [
      { x: mid, y: 0 },
      { x: mid, y: COURT_WIDTH },
    ]);
  }

  ctx.restore();

  const border = Math.max(2, LINE_WIDTH * scale);
  ctx.strokeStyle = LINE;
  ctx.lineWidth = border;
  ctx.lineJoin = "miter";
  ctx.strokeRect(
    rect.x + border / 2,
    rect.y + border / 2,
    rect.w - border,
    rect.h - border,
  );
}
