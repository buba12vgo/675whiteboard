import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { X } from "lucide-react";
import { drawCourt } from "@/lib/court";
import {
  DEFENSE_CIRCLE_R,
  DEFENSE_LOCAL_ANGLE,
  DEFENSE_SCALE,
  DEFENSE_TIP_X,
  DEFENSE_TIP_Y,
  DEFENSE_VIEW,
} from "@/lib/defense-mark";
import { fitCourt, type CourtTransform } from "@/lib/geometry";
import { canvasToPng, renderBoardCanvas } from "@/lib/image";
import { ballHolderId } from "@/lib/movement";
import { hitTestStroke, renderStrokes, simplifyPoints } from "@/lib/strokes";
import { interpolateTokens } from "@/lib/playback";
import type { Point, Stroke } from "@/lib/types";
import { clamp, uid } from "@/lib/utils";
import { useBoard, usePlayback } from "@/state/board-context";
import { TokenMark } from "@/components/token-mark";

const ERASER_RADIUS = 0.36;

function pressureOf(event: PointerEvent): number {
  if (event.pointerType === "pen") return clamp(event.pressure || 0.15, 0.05, 1);
  return 0.5;
}

export function Board() {
  const {
    state,
    tool,
    color,
    lineStyle,
    cap,
    width,
    commitStroke,
    eraseStrokes,
    moveToken,
    rotateToken,
    removeToken,
    registerExporter,
    playStore,
    stopPlayback,
    showThree,
    floor,
    flatColor,
  } = useBoard();
  const play = usePlayback();
  const rootRef = useRef<HTMLDivElement>(null);
  const courtRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [selected, setSelected] = useState<string | null>(null);
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null);
  const transformRef = useRef<CourtTransform | null>(null);
  const toolRef = useRef({ tool, color, lineStyle, cap, width });
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    toolRef.current = { tool, color, lineStyle, cap, width };
    stateRef.current = state;
  });
  const liveRef = useRef<Stroke | null>(null);
  const hiddenRef = useRef<Set<string>>(new Set());
  const activePointer = useRef<number | null>(null);
  const penActive = useRef(false);
  const dragRef = useRef<{
    id: string;
    pointer: number;
    originX: number;
    originY: number;
    startX: number;
    startY: number;
    recorded: boolean;
  } | null>(null);
  const rotateRef = useRef<{
    id: string;
    pointer: number;
    cx: number;
    cy: number;
    recorded: boolean;
  } | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const drawInkRef = useRef<() => void>(() => {});

  const shownIndex = play.playing
    ? Math.min(play.index, state.doc.frames.length - 1)
    : state.doc.frameIndex;
  const frame = state.doc.frames[shownIndex] ?? state.doc.frames[0];
  const nextFrame = state.doc.frames[(shownIndex + 1) % state.doc.frames.length];
  const displayTokens =
    play.playing && state.doc.frames.length > 1
      ? interpolateTokens(frame.tokens, nextFrame.tokens, play.t, frame.strokes)
      : frame.tokens.map((token) => ({ ...token, opacity: 1 }));
  const holderId = ballHolderId(displayTokens);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const rect = el.getBoundingClientRect();
      setSize({ w: rect.width, h: rect.height });
    };
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const transform = useMemo(() => {
    if (size.w < 2 || size.h < 2) return null;
    const pad = clamp(Math.min(size.w, size.h) * 0.028, 12, 32);
    return fitCourt(state.doc.view, size.w, size.h, pad);
  }, [size.w, size.h, state.doc.view]);

  useLayoutEffect(() => {
    drawInkRef.current = () => {
      const ink = inkRef.current;
      const current = transformRef.current;
      if (!ink || !current || size.w < 2) return;
      const ctx = prepareCanvas(ink, size.w, size.h);
      const doc = stateRef.current.doc;
      const index = playStore.get().playing
        ? Math.min(playStore.get().index, doc.frames.length - 1)
        : doc.frameIndex;
      const strokes = doc.frames[index]?.strokes ?? [];
      renderStrokes(ctx, size.w, size.h, strokes, current, liveRef.current, hiddenRef.current);
    };
  });

  useLayoutEffect(() => {
    transformRef.current = transform;
    if (!transform) return;
    const court = courtRef.current;
    if (!court) return;
    const ctx = prepareCanvas(court, size.w, size.h);
    drawCourt(ctx, transform, { three: showThree, floor, flatColor });
    drawInkRef.current();
  }, [transform, size.w, size.h, showThree, floor, flatColor]);

  useEffect(() => {
    drawInkRef.current();
  }, [frame, frame.strokes, transform, size.w, size.h, shownIndex]);

  useEffect(() => {
    registerExporter(async () => {
      const doc = stateRef.current.doc;
      const current = doc.frames[doc.frameIndex];
      const hint = transformRef.current?.orientation ?? (doc.view === "half" ? "half" : "length-x");
      const canvas = renderBoardCanvas(doc.view, hint, current.strokes, current.tokens, { three: showThree, floor, flatColor });
      return canvasToPng(canvas);
    });
    return () => registerExporter(null);
  }, [registerExporter, showThree, floor, flatColor]);

  function eventPoint(event: PointerEvent): Point | null {
    const canvas = inkRef.current;
    const current = transformRef.current;
    if (!canvas || !current) return null;
    const rect = canvas.getBoundingClientRect();
    const court = current.toCourt(event.clientX - rect.left, event.clientY - rect.top);
    const margin = 0.35;
    const visible = current.visible;
    return {
      x: clamp(court.x, visible.x0 - margin, visible.x1 + margin),
      y: clamp(court.y, visible.y0 - margin, visible.y1 + margin),
      p: pressureOf(event),
    };
  }

  function insideCourt(point: Point): boolean {
    const visible = transformRef.current?.visible;
    if (!visible) return false;
    return (
      point.x >= visible.x0 - 0.08 &&
      point.x <= visible.x1 + 0.08 &&
      point.y >= visible.y0 - 0.08 &&
      point.y <= visible.y1 + 0.08
    );
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    if (event.button !== 0) return;
    if (event.pointerType === "touch" && penActive.current) return;
    if (activePointer.current !== null) return;
    const currentTool = toolRef.current;
    if (currentTool.tool === "move") {
      setSelected(null);
      return;
    }
    const native = event.nativeEvent;
    const point = eventPoint(native);
    if (!point || !insideCourt(point)) return;
    event.preventDefault();
    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (event.pointerType === "pen") penActive.current = true;
    stopPlayback();

    if (currentTool.tool === "erase") {
      hiddenRef.current = new Set();
      eraseAt(point);
      setCursor(localPoint(event));
      return;
    }

    liveRef.current = {
      id: uid(),
      points: [point],
      color: currentTool.color,
      width: currentTool.width,
      style: currentTool.lineStyle,
      cap: currentTool.cap,
    };
    drawInkRef.current();
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    if (toolRef.current.tool === "erase") setCursor(localPoint(event));
    if (activePointer.current !== event.pointerId) return;
    const native = event.nativeEvent;
    const coalesced = native.getCoalescedEvents?.() ?? [native];
    const samples = (coalesced.length ? coalesced : [native]).map((item) => eventPoint(item)).filter((item): item is Point => item !== null);
    if (samples.length === 0) return;
    if (toolRef.current.tool === "erase") {
      for (const sample of samples) eraseAt(sample);
      return;
    }
    const live = liveRef.current;
    const current = transformRef.current;
    if (!live || !current) return;
    const min = 0.65 / current.scale;
    for (const sample of samples) {
      const last = live.points[live.points.length - 1];
      if (last && Math.hypot(sample.x - last.x, sample.y - last.y) < min) continue;
      live.points.push(sample);
    }
    drawInkRef.current();
  }

  function finishPointer(event: React.PointerEvent<HTMLCanvasElement>) {
    if (activePointer.current !== event.pointerId) return;
    activePointer.current = null;
    if (event.pointerType === "pen") penActive.current = false;
    if (toolRef.current.tool === "erase") {
      const ids = [...hiddenRef.current];
      hiddenRef.current = new Set();
      if (ids.length) eraseStrokes(ids);
      else drawInkRef.current();
      return;
    }
    const live = liveRef.current;
    liveRef.current = null;
    if (!live) return;
    const scale = transformRef.current?.scale ?? 50;
    const simplified = simplifyPoints(live.points, 0.75 / scale);
    commitStroke({ ...live, points: simplified.length ? simplified : live.points });
  }

  function eraseAt(point: Point) {
    const doc = stateRef.current.doc;
    const strokes = doc.frames[doc.frameIndex]?.strokes ?? [];
    let changed = false;
    for (const stroke of strokes) {
      if (hiddenRef.current.has(stroke.id)) continue;
      if (hitTestStroke(stroke, point.x, point.y, ERASER_RADIUS)) {
        hiddenRef.current.add(stroke.id);
        changed = true;
      }
    }
    if (changed) drawInkRef.current();
  }

  function localPoint(event: React.PointerEvent): { x: number; y: number } {
    const rect = event.currentTarget.getBoundingClientRect();
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  }

  function beginMove(event: React.PointerEvent, token: { id: string; x: number; y: number }) {
    if (tool !== "move" || play.playing) return;
    const current = transformRef.current;
    if (!current) return;
    event.stopPropagation();
    event.preventDefault();
    setSelected(token.id);
    event.currentTarget.setPointerCapture(event.pointerId);
    const origin = current.toScreen(token.x, token.y);
    dragRef.current = {
      id: token.id,
      pointer: event.pointerId,
      originX: origin.x,
      originY: origin.y,
      startX: event.clientX,
      startY: event.clientY,
      recorded: false,
    };
  }

  function dragMove(event: React.PointerEvent, tokenId: string) {
    const drag = dragRef.current;
    const current = transformRef.current;
    if (!drag || drag.pointer !== event.pointerId || drag.id !== tokenId || !current) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    const court = current.toCourt(drag.originX + dx, drag.originY + dy);
    const x = clamp(court.x, current.visible.x0 + 0.3, current.visible.x1 - 0.3);
    const y = clamp(court.y, current.visible.y0 + 0.3, current.visible.y1 - 0.3);
    if (!drag.recorded) {
      if (Math.hypot(dx, dy) < 3) return;
      drag.recorded = true;
      moveToken(tokenId, x, y, true);
    } else {
      moveToken(tokenId, x, y, false);
    }
  }

  function beginRotate(event: React.PointerEvent, token: { id: string; x: number; y: number }) {
    if (tool !== "move" || play.playing) return;
    event.stopPropagation();
    event.preventDefault();
    const current = transformRef.current;
    const overlay = overlayRef.current;
    if (!current || !overlay) return;
    const rect = overlay.getBoundingClientRect();
    const screen = current.toScreen(token.x, token.y);
    event.currentTarget.setPointerCapture(event.pointerId);
    rotateRef.current = {
      id: token.id,
      pointer: event.pointerId,
      cx: rect.left + screen.x,
      cy: rect.top + screen.y,
      recorded: false,
    };
  }

  function dragRotate(event: React.PointerEvent, token: { id: string; rotation?: number }) {
    const rot = rotateRef.current;
    if (!rot || rot.pointer !== event.pointerId || rot.id !== token.id) return;
    const pointer = Math.atan2(event.clientY - rot.cy, event.clientX - rot.cx);
    const next = normDegrees(((pointer - DEFENSE_LOCAL_ANGLE) * 180) / Math.PI);
    const current = token.rotation ?? 0;
    if (!rot.recorded) {
      let delta = next - current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      if (Math.abs(delta) < 2) return;
      rot.recorded = true;
      rotateToken(token.id, next, true);
    } else {
      rotateToken(token.id, next, false);
    }
  }

  const tokenSize = transform ? clamp(transform.scale * 0.74, 44, 64) : 48;

  return (
    <div ref={rootRef} className="absolute inset-0 touch-none" onContextMenu={(event) => event.preventDefault()}>
      <canvas ref={courtRef} className="absolute inset-0 h-full w-full" />
      <canvas
        ref={inkRef}
        className="absolute inset-0 h-full w-full touch-none"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={finishPointer}
        onPointerCancel={finishPointer}
        onPointerLeave={() => setCursor(null)}
      />
      {transform && (
        <div
          ref={overlayRef}
          className="absolute inset-0"
          style={{ pointerEvents: tool === "move" && !play.playing ? "auto" : "none" }}
          onPointerDown={() => setSelected(null)}
        >
          {displayTokens.map((token) => {
            const screen = transform.toScreen(token.x, token.y);
            const size = token.kind === "ball" ? tokenSize * 0.72 : token.kind === "obstacle" ? tokenSize * 0.86 : tokenSize;
            const defense = token.kind === "defense";
            const box = defense ? tokenSize * DEFENSE_SCALE : size;
            const active = selected === token.id && tool === "move";
            const circle = box * ((DEFENSE_CIRCLE_R * 2) / DEFENSE_VIEW);
            return (
              <div
                key={token.id}
                className="absolute"
                style={{
                  left: screen.x,
                  top: screen.y,
                  transform: "translate(-50%, -50%)",
                  opacity: token.opacity,
                  zIndex: token.kind === "ball" ? 3 : active ? 4 : 2,
                  touchAction: "none",
                }}
              >
                <div
                  className="relative"
                  style={{
                    width: box,
                    height: box,
                    transform: defense ? `rotate(${token.rotation ?? 0}deg)` : undefined,
                    transformOrigin: "center",
                  }}
                >
                  {defense ? (
                    <div className="pointer-events-none absolute inset-0">
                      <TokenMark token={token} size={box} />
                    </div>
                  ) : null}
                  <button
                    type="button"
                    aria-label={token.kind === "ball" ? "Balón" : token.kind === "obstacle" ? "Obstáculo" : token.label}
                    className={
                      defense
                        ? "absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                        : "relative grid place-items-center rounded-full"
                    }
                    style={
                      defense
                        ? { width: circle * 1.15, height: circle * 1.15, touchAction: "none" }
                        : { width: size, height: size, touchAction: "none" }
                    }
                    onPointerDown={(event) => beginMove(event, token)}
                    onPointerMove={(event) => dragMove(event, token.id)}
                    onPointerUp={() => {
                      dragRef.current = null;
                    }}
                  >
                    {active &&
                      (defense ? (
                        <span
                          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-amber"
                          style={{ width: circle * 1.12, height: circle * 1.12 }}
                        />
                      ) : (
                        <span className="absolute -inset-1 rounded-[32%] border-2 border-amber" />
                      ))}
                    {defense ? null : <TokenMark token={token} size={size} holding={token.id === holderId} />}
                  </button>
                  {active && defense && !play.playing && (
                    <button
                      type="button"
                      aria-label={`Girar ${token.label}`}
                      className="absolute z-10 grid place-items-center rounded-full border-2 border-amber bg-cream shadow"
                      style={{
                        left: `${DEFENSE_TIP_X * 100}%`,
                        top: `${DEFENSE_TIP_Y * 100}%`,
                        width: 22,
                        height: 22,
                        transform: "translate(-50%, -50%)",
                        touchAction: "none",
                      }}
                      onPointerDown={(event) => beginRotate(event, token)}
                      onPointerMove={(event) => dragRotate(event, token)}
                      onPointerUp={() => {
                        rotateRef.current = null;
                      }}
                      onPointerCancel={() => {
                        rotateRef.current = null;
                      }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                    </button>
                  )}
                </div>
                {active && (
                  <button
                    type="button"
                    aria-label={`Quitar ${token.label || "balón"}`}
                    className="absolute z-20 grid h-7 w-7 place-items-center rounded-full bg-ink text-cream shadow"
                    style={
                      defense
                        ? {
                            left: `calc(50% + ${circle * 0.46}px)`,
                            top: `calc(50% + ${circle * 0.46}px)`,
                            transform: "translate(-50%, -50%)",
                          }
                        : { right: -4, top: -4 }
                    }
                    onPointerDown={(event) => {
                      event.stopPropagation();
                      event.preventDefault();
                      removeToken(token.id);
                      setSelected(null);
                    }}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
      {tool === "erase" && cursor && transform && (
        <div
          className="pointer-events-none absolute rounded-full border-2 border-ink/80 bg-white/25"
          style={{
            width: ERASER_RADIUS * 2 * transform.scale,
            height: ERASER_RADIUS * 2 * transform.scale,
            left: cursor.x,
            top: cursor.y,
            transform: "translate(-50%, -50%)",
          }}
        />
      )}
    </div>
  );
}

function normDegrees(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function prepareCanvas(canvas: HTMLCanvasElement, width: number, height: number) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
  const bw = Math.max(1, Math.round(width * dpr));
  const bh = Math.max(1, Math.round(height * dpr));
  if (canvas.width !== bw || canvas.height !== bh) {
    canvas.width = bw;
    canvas.height = bh;
  }
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas");
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return ctx;
}
