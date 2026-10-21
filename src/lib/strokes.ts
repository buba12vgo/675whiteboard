import getStroke from "perfect-freehand";
import type { CourtTransform } from "@/lib/geometry";
import { shotPaint } from "@/lib/shot";
import type { Point, Stroke } from "@/lib/types";
import { isLightColor } from "@/lib/utils";

type XY = { x: number; y: number };

export function distToSegment(px: number, py: number, a: XY, b: XY): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - a.x, py - a.y);
  const t = Math.max(0, Math.min(1, ((px - a.x) * dx + (py - a.y) * dy) / len2));
  return Math.hypot(px - (a.x + t * dx), py - (a.y + t * dy));
}

export function hitTestStroke(stroke: Stroke, x: number, y: number, radius: number): boolean {
  const reach = radius + stroke.width * 0.5;
  const pts = stroke.points;
  if (pts.length === 0) return false;
  if (pts.length === 1) return Math.hypot(pts[0].x - x, pts[0].y - y) <= reach;
  for (let i = 1; i < pts.length; i += 1) {
    if (distToSegment(x, y, pts[i - 1], pts[i]) <= reach) return true;
  }
  return false;
}

export function simplifyPoints(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points.slice();
  const keep = new Array<boolean>(points.length).fill(false);
  keep[0] = true;
  keep[points.length - 1] = true;
  const stack: Array<[number, number]> = [[0, points.length - 1]];
  while (stack.length) {
    const [start, end] = stack.pop()!;
    let maxDist = 0;
    let index = -1;
    for (let i = start + 1; i < end; i += 1) {
      const dist = distToSegment(points[i].x, points[i].y, points[start], points[end]);
      if (dist > maxDist) {
        maxDist = dist;
        index = i;
      }
    }
    if (index !== -1 && maxDist > epsilon) {
      keep[index] = true;
      stack.push([start, index], [index, end]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

export function resample(points: XY[], step: number): XY[] {
  if (points.length === 0) return [];
  if (step <= 0) return points.slice();
  const out: XY[] = [{ ...points[0] }];
  let carry = 0;
  for (let i = 1; i < points.length; i += 1) {
    let ax = points[i - 1].x;
    let ay = points[i - 1].y;
    const bx = points[i].x;
    const by = points[i].y;
    let dx = bx - ax;
    let dy = by - ay;
    let dist = Math.hypot(dx, dy);
    if (dist === 0) continue;
    while (carry + dist >= step) {
      const t = (step - carry) / dist;
      ax += dx * t;
      ay += dy * t;
      out.push({ x: ax, y: ay });
      dx = bx - ax;
      dy = by - ay;
      dist = Math.hypot(dx, dy);
      carry = 0;
      if (dist === 0) break;
    }
    carry += dist;
  }
  const last = points[points.length - 1];
  const prev = out[out.length - 1];
  if (Math.hypot(last.x - prev.x, last.y - prev.y) > step * 0.35) out.push({ ...last });
  return out;
}

/** Assist: a pass that curls once before the arrow. */
export function assistPoints(points: XY[], radius: number): XY[] {
  if (points.length < 2 || radius <= 0) return points;
  const end = points[points.length - 1];
  let from = points[0];
  for (let i = points.length - 2; i >= 0; i -= 1) {
    if (Math.hypot(end.x - points[i].x, end.y - points[i].y) >= radius * 2.2) {
      from = points[i];
      break;
    }
  }
  const angle = Math.atan2(end.y - from.y, end.x - from.x);
  const center = {
    x: end.x - Math.cos(angle) * radius * 2.3,
    y: end.y - Math.sin(angle) * radius * 2.3,
  };
  const loop: XY[] = [];
  const start = angle + Math.PI;
  for (let i = 0; i <= 12; i += 1) {
    const turn = start + (i / 12) * Math.PI * 1.7;
    loop.push({
      x: center.x + Math.cos(turn) * radius,
      y: center.y + Math.sin(turn) * radius,
    });
  }
  return [...points.slice(0, -1), ...loop, end];
}

/** Shift a polyline sideways by a pixel distance. */
export function offsetPolyline(points: XY[], distance: number): XY[] {
  if (points.length === 0 || distance === 0) return points.map((point) => ({ ...point }));
  return points.map((point, index) => {
    const prev = points[Math.max(0, index - 1)];
    const next = points[Math.min(points.length - 1, index + 1)];
    let dx = next.x - prev.x;
    let dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    return { x: point.x - dy * distance, y: point.y + dx * distance };
  });
}

export function zigzagPoints(points: XY[], step: number, amplitude: number): XY[] {
  const samples = resample(points, step);
  if (samples.length < 3) return samples;
  return samples.map((point, index) => {
    if (index === 0 || index === samples.length - 1) return point;
    const prev = samples[index - 1];
    const next = samples[Math.min(samples.length - 1, index + 1)];
    const dx = next.x - prev.x;
    const dy = next.y - prev.y;
    const len = Math.hypot(dx, dy) || 1;
    const side = index % 2 === 0 ? 1 : -1;
    return {
      x: point.x + (-dy / len) * amplitude * side,
      y: point.y + (dx / len) * amplitude * side,
    };
  });
}

function endDirection(points: XY[]): { from: XY; to: XY } | null {
  if (points.length < 2) return null;
  const to = points[points.length - 1];
  for (let i = points.length - 2; i >= 0; i -= 1) {
    if (Math.hypot(to.x - points[i].x, to.y - points[i].y) >= 8) {
      return { from: points[i], to };
    }
  }
  return { from: points[0], to };
}

function drawArrow(ctx: CanvasRenderingContext2D, from: XY, to: XY, size: number, color: string) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - 0.42), to.y - size * Math.sin(angle - 0.42));
  ctx.lineTo(to.x - size * 0.62 * Math.cos(angle), to.y - size * 0.62 * Math.sin(angle));
  ctx.lineTo(to.x - size * Math.cos(angle + 0.42), to.y - size * Math.sin(angle + 0.42));
  ctx.closePath();
  ctx.fill();
}

function drawTee(ctx: CanvasRenderingContext2D, from: XY, to: XY, length: number, thickness: number, color: string) {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  const px = -Math.sin(angle);
  const py = Math.cos(angle);
  ctx.strokeStyle = color;
  ctx.lineWidth = thickness;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(to.x - (px * length) / 2, to.y - (py * length) / 2);
  ctx.lineTo(to.x + (px * length) / 2, to.y + (py * length) / 2);
  ctx.stroke();
}

/** Short fixed "=>": two parallel strokes and an open chevron, not a filled head. */
function drawShotMark(ctx: CanvasRenderingContext2D, from: XY, to: XY, color: string, scale: number) {
  const paint = shotPaint(scale);
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 4) return;
  const ux = dx / len;
  const uy = dy / len;
  const px = -uy;
  const py = ux;
  const head = Math.min(paint.head, len * 0.48);
  const shaft = Math.max(len * 0.52, len - head * 0.55);
  const gap = paint.gap / 2;
  ctx.strokeStyle = color;
  ctx.lineWidth = paint.line;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  ctx.beginPath();
  for (const side of [-1, 1]) {
    ctx.moveTo(from.x + px * gap * side, from.y + py * gap * side);
    ctx.lineTo(from.x + ux * shaft + px * gap * side, from.y + uy * shaft + py * gap * side);
  }
  ctx.stroke();
  const angle = Math.atan2(uy, ux);
  const spread = 0.58;
  ctx.beginPath();
  ctx.moveTo(to.x - head * Math.cos(angle - spread), to.y - head * Math.sin(angle - spread));
  ctx.lineTo(to.x, to.y);
  ctx.lineTo(to.x - head * Math.cos(angle + spread), to.y - head * Math.sin(angle + spread));
  ctx.stroke();
}

function traceSmooth(ctx: CanvasRenderingContext2D, points: XY[]) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 1) {
    ctx.lineTo(points[0].x + 0.01, points[0].y);
    return;
  }
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 1; i < points.length - 1; i += 1) {
    const mx = (points[i].x + points[i + 1].x) / 2;
    const my = (points[i].y + points[i + 1].y) / 2;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  const last = points[points.length - 1];
  ctx.lineTo(last.x, last.y);
}

function screenPoints(stroke: Stroke, toScreen: CourtTransform["toScreen"]): Array<XY & { p: number }> {
  return stroke.points.map((point) => {
    const s = toScreen(point.x, point.y);
    return { x: s.x, y: s.y, p: point.p };
  });
}

export function renderStroke(
  ctx: CanvasRenderingContext2D,
  stroke: Stroke,
  toScreen: CourtTransform["toScreen"],
  scale: number,
  complete: boolean,
) {
  const pts = screenPoints(stroke, toScreen);
  if (pts.length === 0) return;
  const widthPx = Math.max(1.4, stroke.width * scale);
  ctx.save();
  if (isLightColor(stroke.color)) {
    ctx.shadowColor = "rgba(40, 28, 16, 0.45)";
    ctx.shadowBlur = 2.5;
  }

  if (stroke.style === "shot") {
    if (pts.length > 1) {
      const from = pts[0];
      const tip = pts[pts.length - 1];
      const dx = tip.x - from.x;
      const dy = tip.y - from.y;
      const len = Math.hypot(dx, dy) || 1;
      const draw = Math.min(len, shotPaint(scale).length);
      drawShotMark(ctx, from, { x: from.x + (dx / len) * draw, y: from.y + (dy / len) * draw }, stroke.color, scale);
    }
    ctx.restore();
    return;
  }

  if (stroke.style === "solid") {
    const usesPen = pts.some((point) => point.p > 0 && point.p !== 0.5);
    const outline = getStroke(
      pts.map((point) => [point.x, point.y, point.p]),
      {
        size: widthPx,
        thinning: usesPen ? 0.55 : 0.35,
        smoothing: 0.55,
        streamline: 0.45,
        simulatePressure: !usesPen,
        last: complete,
        start: { cap: true, taper: false },
        end: { cap: true, taper: stroke.cap === "arrow" && complete ? widthPx * 1.4 : false },
      },
    );
    if (outline.length > 1) {
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let i = 1; i < outline.length; i += 1) ctx.lineTo(outline[i][0], outline[i][1]);
      ctx.closePath();
      ctx.fillStyle = stroke.color;
      ctx.fill();
    } else {
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(pts[0].x, pts[0].y, widthPx / 2, 0, Math.PI * 2);
      ctx.fill();
    }
  } else {
    const path =
      stroke.style === "zigzag"
        ? zigzagPoints(pts, Math.max(10, 0.42 * scale), Math.max(5, 0.26 * scale))
        : stroke.style === "assist"
          ? assistPoints(pts, Math.max(7, 0.22 * scale))
          : pts;
    if (path.length === 1) {
      ctx.fillStyle = stroke.color;
      ctx.beginPath();
      ctx.arc(path[0].x, path[0].y, widthPx / 2, 0, Math.PI * 2);
      ctx.fill();
    } else {
      traceSmooth(ctx, path);
      ctx.strokeStyle = stroke.color;
      ctx.lineWidth = widthPx;
      ctx.lineJoin = "round";
      const dashed = stroke.style === "dashed" || stroke.style === "assist";
      ctx.lineCap = dashed ? "butt" : "round";
      if (dashed) {
        ctx.setLineDash([widthPx * 1.7, widthPx * 1.45]);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  if (complete && stroke.cap !== "none" && pts.length > 1) {
    const dir = endDirection(pts);
    if (dir && Math.hypot(dir.to.x - dir.from.x, dir.to.y - dir.from.y) > 4) {
      if (stroke.cap === "arrow") {
        drawArrow(ctx, dir.from, dir.to, Math.max(12, widthPx * 2.5), stroke.color);
      } else {
        drawTee(ctx, dir.from, dir.to, Math.max(16, 0.95 * scale), Math.max(widthPx, 3), stroke.color);
      }
    }
  }
  ctx.restore();
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strokes: Stroke[],
  transform: CourtTransform,
  live: Stroke | null,
  hidden: ReadonlySet<string>,
) {
  ctx.clearRect(0, 0, width, height);
  ctx.save();
  ctx.beginPath();
  ctx.rect(transform.rect.x, transform.rect.y, transform.rect.w, transform.rect.h);
  ctx.clip();
  for (const stroke of strokes) {
    if (hidden.has(stroke.id)) continue;
    renderStroke(ctx, stroke, transform.toScreen, transform.scale, true);
  }
  if (live && live.points.length) {
    renderStroke(ctx, live, transform.toScreen, transform.scale, false);
  }
  ctx.restore();
}
