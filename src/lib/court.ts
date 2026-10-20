import {
  arcPoints,
  BACKBOARD_INSET,
  BASKET_INSET,
  CENTER_RADIUS,
  COURT_LENGTH,
  COURT_WIDTH,
  FT_RADIUS,
  KEY_LENGTH,
  KEY_WIDTH,
  LINE_WIDTH,
  NO_CHARGE_RADIUS,
  RIM_RADIUS,
  THREE_ALPHA,
  THREE_CORNER,
  THREE_DX,
  THREE_RADIUS,
  type CourtTransform,
  type Meter,
} from "@/lib/geometry";

const LINE = "#173454";
const RIM = "#ef5d24";

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

function drawBasket(ctx: CanvasRenderingContext2D, transform: CourtTransform, side: "left" | "right") {
  const sign = side === "left" ? 1 : -1;
  const baseline = side === "left" ? 0 : COURT_LENGTH;
  const basketX = side === "left" ? BASKET_INSET : COURT_LENGTH - BASKET_INSET;
  const midY = COURT_WIDTH / 2;
  const laneHalf = KEY_WIDTH / 2;
  const keyEnd = side === "left" ? KEY_LENGTH : COURT_LENGTH - KEY_LENGTH;

  fillMeters(
    ctx,
    transform,
    [
      { x: baseline, y: midY - laneHalf },
      { x: keyEnd, y: midY - laneHalf },
      { x: keyEnd, y: midY + laneHalf },
      { x: baseline, y: midY + laneHalf },
    ],
    "rgba(36, 76, 120, 0.18)",
  );

  strokeMeters(ctx, transform, [
    { x: baseline, y: midY - laneHalf },
    { x: keyEnd, y: midY - laneHalf },
    { x: keyEnd, y: midY + laneHalf },
    { x: baseline, y: midY + laneHalf },
  ]);

  const ftX = keyEnd;
  const solid = side === "left" ? [-Math.PI / 2, Math.PI / 2] : [Math.PI / 2, (3 * Math.PI) / 2];
  const dashed = side === "left" ? [Math.PI / 2, (3 * Math.PI) / 2] : [-Math.PI / 2, Math.PI / 2];
  strokeMeters(ctx, transform, arcPoints(ftX, midY, FT_RADIUS, solid[0], solid[1], 36));
  strokeMeters(ctx, transform, arcPoints(ftX, midY, FT_RADIUS, dashed[0], dashed[1], 36), {
    dash: [0.16, 0.12],
  });

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

  const charge0 = side === "left" ? -Math.PI / 2 : Math.PI / 2;
  const charge1 = side === "left" ? Math.PI / 2 : (3 * Math.PI) / 2;
  strokeMeters(ctx, transform, arcPoints(basketX, midY, NO_CHARGE_RADIUS, charge0, charge1, 28), {
    dash: [0.12, 0.1],
    width: Math.max(1.2, LINE_WIDTH * 0.8 * transform.scale),
  });

  const boardX = side === "left" ? BACKBOARD_INSET : COURT_LENGTH - BACKBOARD_INSET;
  strokeMeters(
    ctx,
    transform,
    [
      { x: boardX, y: midY - 0.9 },
      { x: boardX, y: midY + 0.9 },
    ],
    { width: Math.max(3, 0.08 * transform.scale), color: "#1c1916" },
  );

  const rimStart = side === "left" ? basketX - RIM_RADIUS : basketX + RIM_RADIUS;
  strokeMeters(
    ctx,
    transform,
    [
      { x: boardX, y: midY },
      { x: rimStart, y: midY },
    ],
    { width: Math.max(1.5, 0.035 * transform.scale), color: "#1c1916" },
  );

  const rim = transform.toScreen(basketX, midY);
  ctx.beginPath();
  ctx.arc(rim.x, rim.y, RIM_RADIUS * transform.scale, 0, Math.PI * 2);
  ctx.strokeStyle = RIM;
  ctx.lineWidth = Math.max(2, 0.045 * transform.scale);
  ctx.setLineDash([]);
  ctx.stroke();
}

function woodGrain(ctx: CanvasRenderingContext2D, rect: CourtTransform["rect"]) {
  ctx.save();
  ctx.globalAlpha = 0.045;
  ctx.strokeStyle = "#6a4524";
  ctx.lineWidth = 1;
  for (let i = 0; i < 16; i += 1) {
    const y = rect.y + ((i * 73 + 19) % 100) / 100 * rect.h;
    const bend = ((i * 17) % 9) - 4;
    ctx.beginPath();
    ctx.moveTo(rect.x, y);
    ctx.bezierCurveTo(
      rect.x + rect.w * 0.3,
      y + bend,
      rect.x + rect.w * 0.65,
      y - bend,
      rect.x + rect.w,
      y + bend * 0.3,
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function drawCourt(ctx: CanvasRenderingContext2D, transform: CourtTransform) {
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

  const grain = ctx.createLinearGradient(rect.x, rect.y, rect.x, rect.y + rect.h);
  grain.addColorStop(0, "#f4e3c9");
  grain.addColorStop(0.48, "#e8d2b0");
  grain.addColorStop(1, "#dcc39b");
  ctx.fillStyle = grain;
  ctx.fillRect(rect.x, rect.y, rect.w, rect.h);
  woodGrain(ctx, rect);

  drawBasket(ctx, transform, "left");
  drawBasket(ctx, transform, "right");

  const mid = COURT_LENGTH / 2;
  strokeMeters(ctx, transform, [
    { x: mid, y: 0 },
    { x: mid, y: COURT_WIDTH },
  ]);
  strokeMeters(ctx, transform, arcPoints(mid, COURT_WIDTH / 2, CENTER_RADIUS, 0, Math.PI * 2, 64));

  ctx.save();
  ctx.beginPath();
  ctx.rect(rect.x, rect.y, rect.w, rect.h);
  ctx.clip();
  ctx.strokeStyle = "rgba(70, 46, 22, 0.16)";
  ctx.lineWidth = Math.max(10, 0.22 * scale);
  ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
  ctx.restore();

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
