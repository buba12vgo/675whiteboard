import { drawCourt, type CourtPaint } from "@/lib/court";
import { fitCourt, type CourtTransform } from "@/lib/geometry";
import { ballHolderId } from "@/lib/movement";
import { renderStroke } from "@/lib/strokes";
import type { CourtView, Stroke, Token } from "@/lib/types";
import { slugify } from "@/lib/utils";

export function drawTokenGlyph(
  ctx: CanvasRenderingContext2D,
  token: Token,
  cx: number,
  cy: number,
  size: number,
  opacity = 1,
  holding = false,
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(cx, cy);
  if (token.kind === "ball") {
    const r = size * 0.34;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fillStyle = "#e86b1f";
    ctx.fill();
    ctx.lineWidth = Math.max(1.4, size * 0.045);
    ctx.strokeStyle = "#1a120c";
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(-r * 0.72, -r * 0.55);
    ctx.bezierCurveTo(-r * 0.1, -r * 0.2, -r * 0.1, r * 0.2, -r * 0.72, r * 0.55);
    ctx.moveTo(r * 0.72, -r * 0.55);
    ctx.bezierCurveTo(r * 0.1, -r * 0.2, r * 0.1, r * 0.2, r * 0.72, r * 0.55);
    ctx.stroke();
    ctx.restore();
    return;
  }

  const radius = size / 2;
  ctx.lineWidth = Math.max(2, size * 0.08);
  ctx.lineCap = "round";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = `700 ${Math.round(size * 0.36)}px Outfit, sans-serif`;

  if (token.kind === "obstacle") {
    const box = size * 0.62;
    ctx.strokeStyle = "#1a2332";
    ctx.strokeRect(-box / 2, -box / 2, box, box);
    ctx.restore();
    return;
  }

  if (token.kind === "defense") {
    ctx.strokeStyle = token.color;
    ctx.beginPath();
    ctx.moveTo(-radius * 0.72, -radius * 0.72);
    ctx.lineTo(radius * 0.72, radius * 0.72);
    ctx.moveTo(radius * 0.72, -radius * 0.72);
    ctx.lineTo(-radius * 0.72, radius * 0.72);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, radius * 0.34, 0, Math.PI * 2);
    ctx.fillStyle = "#f6f1e6";
    ctx.fill();
    ctx.lineWidth = Math.max(1.5, size * 0.04);
    ctx.stroke();
    ctx.fillStyle = token.color;
    ctx.fillText(token.label.replace(/^X/i, ""), 0, size * 0.02);
    ctx.restore();
    return;
  }

  ctx.beginPath();
  ctx.arc(0, 0, radius * 0.86, 0, Math.PI * 2);
  ctx.fillStyle = "#f6f1e6";
  ctx.fill();
  ctx.strokeStyle = token.color;
  ctx.stroke();
  ctx.fillStyle = token.color;
  ctx.fillText(token.label, 0, size * 0.02);
  if (holding) {
    const dot = radius * 0.38;
    ctx.beginPath();
    ctx.arc(radius * 0.62, radius * 0.62, dot, 0, Math.PI * 2);
    ctx.fillStyle = "#e86b1f";
    ctx.fill();
    ctx.lineWidth = Math.max(1.2, size * 0.04);
    ctx.strokeStyle = "#1a120c";
    ctx.stroke();
  }
  ctx.restore();
}

export function renderBoardCanvas(
  view: CourtView,
  orientationHint: CourtTransform["orientation"],
  strokes: Stroke[],
  tokens: Array<Token & { opacity?: number }>,
  paint: CourtPaint = { three: true, floor: "parquet-light", flatColor: "#1d4e89" },
): HTMLCanvasElement {
  const pad = 56;
  let width = 2400;
  let height = 1400;
  if (view === "half") {
    height = 2100;
    width = Math.round(height * (15 / 14));
  } else if (orientationHint === "length-y") {
    height = 2800;
    width = Math.round(height * (15 / 28));
  } else {
    width = 2800;
    height = Math.round(width * (15 / 28));
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  const transform = fitCourt(view, width, height, pad);
  drawCourt(ctx, transform, paint);
  ctx.save();
  ctx.beginPath();
  ctx.rect(transform.rect.x, transform.rect.y, transform.rect.w, transform.rect.h);
  ctx.clip();
  for (const stroke of strokes) {
    renderStroke(ctx, stroke, transform.toScreen, transform.scale, true);
  }
  const tokenSize = transform.scale * 0.62;
  const holder = ballHolderId(tokens);
  const ordered = [...tokens].sort((a, b) => (a.kind === "ball" ? 1 : 0) - (b.kind === "ball" ? 1 : 0));
  for (const token of ordered) {
    const screen = transform.toScreen(token.x, token.y);
    const size = token.kind === "ball" ? tokenSize * 0.82 : tokenSize;
    drawTokenGlyph(ctx, token, screen.x, screen.y, size, token.opacity ?? 1, token.id === holder);
  }
  ctx.restore();
  return canvas;
}

export async function canvasToPng(canvas: HTMLCanvasElement): Promise<Blob> {
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((result) => resolve(result), "image/png");
  });
  if (!blob) throw new Error("png");
  return blob;
}

export async function shareOrDownload(blob: Blob, filename: string): Promise<"shared" | "downloaded" | "aborted"> {
  const file = new File([blob], filename, { type: "image/png" });
  const nav = navigator as Navigator & {
    canShare?: (data: ShareData) => boolean;
  };
  if (nav.canShare?.({ files: [file] }) && typeof navigator.share === "function") {
    try {
      await navigator.share({ files: [file], title: filename });
      return "shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "aborted";
    }
  }
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
  return "downloaded";
}

export function pngFilename(name: string): string {
  const stamp = new Date().toISOString().slice(0, 10);
  return `${slugify(name)}-${stamp}.png`;
}

export function downloadJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
