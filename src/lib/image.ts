import { drawCourt, type CourtPaint } from "@/lib/court";
import {
  BALL_BOX,
  BALL_DRAW_R,
  DEFENSE_SCALE,
  DISC_FILL,
  discOuterPx,
  drawAttackMark,
  drawBallMark,
  drawDefenseMark,
} from "@/lib/defense-mark";
import { fitCourt, type CourtTransform } from "@/lib/geometry";
import { ballHolderId } from "@/lib/movement";
import { ATTACK_COLOR, DEFENSE_COLOR, ballBesideHolder, roleColor } from "@/lib/presentation";
import { tokenPx } from "@/lib/shot";
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
) {
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.translate(cx, cy);
  if (token.kind === "ball") {
    drawBallMark(ctx, size);
    ctx.restore();
    return;
  }

  if (token.kind === "obstacle") {
    const box = size * 0.62;
    const stroke = Math.max(2, size * 0.075);
    ctx.lineWidth = stroke;
    ctx.strokeStyle = "#1a2332";
    ctx.strokeRect(-box / 2, -box / 2, box, box);
    ctx.fillStyle = DISC_FILL;
    ctx.fillRect(-box / 2 + stroke / 2, -box / 2 + stroke / 2, box - stroke, box - stroke);
    ctx.restore();
    return;
  }

  if (token.kind === "defense") {
    drawDefenseMark(ctx, token, size);
    ctx.restore();
    return;
  }

  drawAttackMark(ctx, token.color, token.label, size);
  ctx.restore();
}

export function renderBoardCanvas(
  view: CourtView,
  orientationHint: CourtTransform["orientation"],
  strokes: Stroke[],
  tokens: Array<Token & { opacity?: number }>,
  paint: CourtPaint & { attack?: string; defense?: string } = { three: true, floor: "light", flatColor: "#1d4e89" },
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
  const tokenSize = tokenPx(transform.scale);
  const attack = paint.attack ?? ATTACK_COLOR;
  const defense = paint.defense ?? DEFENSE_COLOR;
  const holderId = ballHolderId(tokens);
  const holder = holderId ? tokens.find((token) => token.id === holderId) : undefined;
  const ballDiameter = tokenSize * BALL_BOX * BALL_DRAW_R * 2;
  const ordered = [...tokens].sort((a, b) => (a.kind === "ball" ? 1 : 0) - (b.kind === "ball" ? 1 : 0));
  for (const token of ordered) {
    const at =
      token.kind === "ball" && holder
        ? ballBesideHolder(holder, transform.toScreen, transform.toCourt, discOuterPx(tokenSize), ballDiameter)
        : token;
    const screen = transform.toScreen(at.x, at.y);
    const size =
      token.kind === "ball"
        ? tokenSize * BALL_BOX
        : token.kind === "defense"
          ? tokenSize * DEFENSE_SCALE
          : token.kind === "obstacle"
            ? tokenSize * 0.86
            : tokenSize;
    const shown = { ...token, color: roleColor(token.kind, attack, defense, token.color) };
    drawTokenGlyph(ctx, shown, screen.x, screen.y, size, token.opacity ?? 1);
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
