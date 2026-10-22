import { drawCourt } from "@/lib/court";
import { BALL_BOX, DEFENSE_SCALE } from "@/lib/defense-mark";
import { drawTokenGlyph } from "@/lib/image";
import { ATTACK_COLOR, DEFENSE_COLOR, roleColor } from "@/lib/presentation";
import {
  PAGE_H,
  PAGE_PX_PER_M,
  PAGE_W,
  allSlots,
  formatSessionDate,
  sheetLayout,
  slotTransform,
  type PageInk,
  type Session,
  type SheetSlot,
} from "@/lib/session";
import { tokenPx } from "@/lib/shot";
import { renderStroke } from "@/lib/strokes";
import type { Stroke } from "@/lib/types";
import { isLightColor } from "@/lib/utils";
import { getStroke } from "perfect-freehand";

export type LiveMark =
  | { space: "page"; stroke: PageInk }
  | { space: "court"; slot: SheetSlot; stroke: Stroke };

const PAPER = "#f6f1e7";
const INK = "#173454";

function paintPageInk(ctx: CanvasRenderingContext2D, ink: PageInk, complete: boolean) {
  if (ink.points.length === 0) return;
  if (ink.style === "solid" && ink.cap === "none") {
    const usesPen = ink.points.some((point) => point.p > 0 && point.p !== 0.5);
    const outline = getStroke(
      ink.points.map((point) => [point.x, point.y, point.p]),
      {
        size: ink.width,
        thinning: usesPen ? 0.55 : 0.35,
        smoothing: 0.55,
        streamline: 0.45,
        simulatePressure: !usesPen,
        last: complete,
        start: { cap: true, taper: false },
        end: { cap: true, taper: false },
      },
    );
    ctx.save();
    if (isLightColor(ink.color)) {
      ctx.shadowColor = "rgba(40, 28, 16, 0.35)";
      ctx.shadowBlur = 2;
    }
    ctx.fillStyle = ink.color;
    if (outline.length > 1) {
      ctx.beginPath();
      ctx.moveTo(outline[0][0], outline[0][1]);
      for (let index = 1; index < outline.length; index += 1) ctx.lineTo(outline[index][0], outline[index][1]);
      ctx.closePath();
      ctx.fill();
    } else {
      const point = ink.points[0];
      ctx.beginPath();
      ctx.arc(point.x, point.y, ink.width / 2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    return;
  }
  const stroke: Stroke = {
    id: ink.id,
    color: ink.color,
    style: ink.style,
    cap: ink.cap,
    width: ink.width / PAGE_PX_PER_M,
    points: ink.points.map((point) => ({
      x: point.x / PAGE_PX_PER_M,
      y: point.y / PAGE_PX_PER_M,
      p: point.p,
    })),
  };
  renderStroke(
    ctx,
    stroke,
    (x, y) => ({ x: x * PAGE_PX_PER_M, y: y * PAGE_PX_PER_M }),
    PAGE_PX_PER_M,
    complete,
  );
}

function paintTokens(ctx: CanvasRenderingContext2D, session: Session, slotId: SheetSlot, scale: number, toScreen: (x: number, y: number) => { x: number; y: number }) {
  const size = tokenPx(scale);
  const tokens = [...session.slots[slotId].tokens].sort((a, b) => (a.kind === "ball" ? 1 : 0) - (b.kind === "ball" ? 1 : 0));
  for (const token of tokens) {
    const at = toScreen(token.x, token.y);
    const drawn =
      token.kind === "ball" ? size * BALL_BOX : token.kind === "defense" ? size * DEFENSE_SCALE : token.kind === "obstacle" ? size * 0.86 : size;
    const shown = { ...token, color: roleColor(token.kind, ATTACK_COLOR, DEFENSE_COLOR, token.color) };
    drawTokenGlyph(ctx, shown, at.x, at.y, drawn, 1);
  }
}

export function paintSheet(ctx: CanvasRenderingContext2D, session: Session, live: LiveMark | null, showTitle: boolean) {
  const layout = sheetLayout();
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  ctx.strokeStyle = "rgba(23, 52, 84, 0.14)";
  ctx.lineWidth = 1;
  const rule = 32;
  for (let y = layout.notes.y + 46; y < layout.notes.y + layout.notes.h - 10; y += rule) {
    ctx.beginPath();
    ctx.moveTo(layout.notes.x + 10, y);
    ctx.lineTo(layout.notes.x + layout.notes.w - 10, y);
    ctx.stroke();
  }
  ctx.fillStyle = "rgba(23, 52, 84, 0.45)";
  ctx.font = "600 13px Inter, sans-serif";
  ctx.textBaseline = "middle";
  ctx.textAlign = "left";
  ctx.fillText("NOTAS", layout.notes.x + 10, layout.notes.y + 18);

  for (const slot of allSlots(layout)) {
    const transform = slotTransform(slot.rect, slot.view);
    drawCourt(ctx, transform, { court: session.court, floor: "light", flatColor: "#f4efe4", clear: false });
    ctx.save();
    ctx.beginPath();
    ctx.rect(transform.rect.x, transform.rect.y, transform.rect.w, transform.rect.h);
    ctx.clip();
    for (const stroke of session.slots[slot.id].strokes) {
      renderStroke(ctx, stroke, transform.toScreen, transform.scale, true);
    }
    if (live?.space === "court" && live.slot === slot.id) {
      renderStroke(ctx, live.stroke, transform.toScreen, transform.scale, false);
    }
    ctx.restore();
    paintTokens(ctx, session, slot.id, transform.scale, transform.toScreen);
  }

  for (const stroke of session.ink) paintPageInk(ctx, stroke, true);
  if (live?.space === "page") paintPageInk(ctx, live.stroke, false);

  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.font = "600 26px 'Space Grotesk', Inter, sans-serif";
  ctx.fillText(session.teamName, layout.header.x + 4, layout.header.y + 24);
  ctx.font = "500 16px Inter, sans-serif";
  ctx.textAlign = "right";
  ctx.fillText(formatSessionDate(session.date), layout.header.x + layout.header.w - 4, layout.header.y + 24);
  if (showTitle) {
    ctx.textAlign = "left";
    ctx.font = "600 22px 'Space Grotesk', Inter, sans-serif";
    ctx.fillText(session.title, layout.header.x + 4, layout.header.y + 56);
  }
  ctx.strokeStyle = "rgba(23, 52, 84, 0.45)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(layout.header.x, layout.header.y + layout.header.h);
  ctx.lineTo(layout.header.x + layout.header.w, layout.header.y + layout.header.h);
  ctx.stroke();
  ctx.strokeStyle = "rgba(23, 52, 84, 0.28)";
  ctx.lineWidth = 2;
  ctx.strokeRect(1, 1, PAGE_W - 2, PAGE_H - 2);
}
