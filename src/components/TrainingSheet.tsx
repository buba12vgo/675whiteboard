import { Eraser, Minus, Pencil, Plus, Redo2, Undo2 } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, useState, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { whenCenterLogo } from "@/lib/court";
import { BALL_FILL } from "@/lib/defense-mark";
import { ATTACK_COLOR, DEFENSE_COLOR } from "@/lib/presentation";
import {
  INK_WIDTHS,
  PAGE_H,
  PAGE_W,
  allSlots,
  courtAt,
  nextJersey,
  sheetLayout,
  slotTransform,
  type PageInk,
  type Session,
  type SheetSlot,
} from "@/lib/session";
import { paintSheet, type LiveMark } from "@/lib/sheet-paint";
import { tokenPx } from "@/lib/shot";
import { hitTestStroke, simplifyPoints } from "@/lib/strokes";
import { PEN_COLORS, type LineCap, type LineStyle, type Point, type Stroke, type Token } from "@/lib/types";
import { clamp, cn, uid } from "@/lib/utils";
import { useSession } from "@/state/session-context";

type Mode = "ink" | "erase" | "mark" | "token";
type TokenKind = "attack" | "defense" | "ball";

const SYMBOLS: Array<{ style: LineStyle; cap: LineCap; label: string }> = [
  { style: "solid", cap: "arrow", label: "Continuo" },
  { style: "dashed", cap: "arrow", label: "Pase" },
  { style: "assist", cap: "arrow", label: "Asistencia" },
  { style: "handoff", cap: "none", label: "Mano a mano" },
  { style: "zigzag", cap: "arrow", label: "Zigzag" },
  { style: "shot", cap: "none", label: "Tiro" },
];

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.6;

type Gesture =
  | { kind: "draw"; pointerId: number; space: "page"; stroke: PageInk }
  | { kind: "draw"; pointerId: number; space: "court"; slot: SheetSlot; stroke: Stroke }
  | { kind: "erase"; pointerId: number; ink: PageInk[]; slots: Session["slots"]; changed: boolean }
  | { kind: "token"; pointerId: number; slot: SheetSlot; id: string; slots: Session["slots"]; created: boolean; moved: boolean };

function hitPage(stroke: PageInk, x: number, y: number): boolean {
  const reach = 18 + stroke.width * 0.5;
  const points = stroke.points;
  if (points.length === 0) return false;
  if (points.length === 1) return Math.hypot(points[0].x - x, points[0].y - y) <= reach;
  for (let index = 1; index < points.length; index += 1) {
    if (distToSegment(x, y, points[index - 1], points[index]) <= reach) return true;
  }
  return false;
}

function distToSegment(px: number, py: number, a: Point, b: Point): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const len = dx * dx + dy * dy;
  if (len === 0) return Math.hypot(px - a.x, py - a.y);
  const t = clamp(((px - a.x) * dx + (py - a.y) * dy) / len, 0, 1);
  return Math.hypot(px - (a.x + dx * t), py - (a.y + dy * t));
}

function eraseAt(ink: PageInk[], slots: Session["slots"], x: number, y: number) {
  let changed = false;
  const nextInk = ink.filter((stroke) => {
    const hit = hitPage(stroke, x, y);
    if (hit) changed = true;
    return !hit;
  });
  const nextSlots = { ...slots };
  for (const slot of allSlots()) {
    const transform = slotTransform(slot.rect, slot.view);
    const near =
      x >= transform.rect.x - 24 &&
      x <= transform.rect.x + transform.rect.w + 24 &&
      y >= transform.rect.y - 24 &&
      y <= transform.rect.y + transform.rect.h + 24;
    if (!near) continue;
    const meter = transform.toCourt(x, y);
    const strokes = slots[slot.id].strokes.filter((stroke) => {
      const hit = hitTestStroke(stroke, meter.x, meter.y, 18 / transform.scale);
      if (hit) changed = true;
      return !hit;
    });
    const tokens = slots[slot.id].tokens.filter((token) => {
      const at = transform.toScreen(token.x, token.y);
      const hit = Math.hypot(at.x - x, at.y - y) <= tokenPx(transform.scale) * 0.62;
      if (hit) changed = true;
      return !hit;
    });
    nextSlots[slot.id] = { strokes, tokens };
  }
  return { ink: nextInk, slots: nextSlots, changed };
}

export function TrainingSheet() {
  const sessionApi = useSession();
  const session = sessionApi.active;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const zoomRef = useRef(0.7);
  const gestureRef = useRef<Gesture | null>(null);
  const [zoom, setZoom] = useState(0.7);
  const [mode, setMode] = useState<Mode>("ink");
  const [color, setColor] = useState(PEN_COLORS[0].value);
  const [widthId, setWidthId] = useState<(typeof INK_WIDTHS)[number]["id"]>("medio");
  const [symbol, setSymbol] = useState(0);
  const [tokenKind, setTokenKind] = useState<TokenKind>("attack");
  const [live, setLive] = useState<LiveMark | null>(null);
  const [preview, setPreview] = useState<Session | null>(null);
  const [paintTick, setPaintTick] = useState(0);
  const layout = sheetLayout();
  const width = INK_WIDTHS.find((item) => item.id === widthId) ?? INK_WIDTHS[1];

  useEffect(() => {
    zoomRef.current = zoom;
  }, [zoom]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller || !session) return;
    const styles = getComputedStyle(scroller);
    const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
    const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
    const fit = Math.min((scroller.clientWidth - padX) / PAGE_W, (scroller.clientHeight - padY - 12) / PAGE_H);
    const next = clamp(fit, MIN_ZOOM, 1.05);
    zoomRef.current = next;
    setZoom(next);
    scroller.scrollTop = 0;
    scroller.scrollLeft = 0;
  }, [session?.id]);

  useEffect(() => {
    let cancelled = false;
    const bump = () => {
      if (!cancelled) setPaintTick((value) => value + 1);
    };
    void whenCenterLogo().then(bump);
    void document.fonts?.ready.then(bump);
    return () => {
      cancelled = true;
    };
  }, [session?.id]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !session) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.max(1, Math.round(PAGE_W * zoom * dpr));
    canvas.height = Math.max(1, Math.round(PAGE_H * zoom * dpr));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(canvas.width / PAGE_W, 0, 0, canvas.height / PAGE_H, 0, 0);
    paintSheet(ctx, preview ?? session, live, false);
  }, [live, paintTick, preview, session, zoom]);

  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const zoomAt = (next: number, clientX: number, clientY: number) => {
      const rect = scroller.getBoundingClientRect();
      const current = zoomRef.current;
      const vx = clientX - rect.left;
      const vy = clientY - rect.top;
      (scroller as HTMLDivElement & { _pin?: { pageX: number; pageY: number; vx: number; vy: number } })._pin = {
        pageX: (scroller.scrollLeft + vx) / current,
        pageY: (scroller.scrollTop + vy) / current,
        vx,
        vy,
      };
      const clamped = clamp(next, MIN_ZOOM, MAX_ZOOM);
      zoomRef.current = clamped;
      setZoom(clamped);
    };
    let pinchStart = 0;
    let pinchZoom = zoomRef.current;
    const distance = (touches: TouchList) =>
      Math.hypot(touches[0].clientX - touches[1].clientX, touches[0].clientY - touches[1].clientY);
    const onTouchStart = (event: TouchEvent) => {
      if (event.touches.length === 2) {
        pinchStart = distance(event.touches);
        pinchZoom = zoomRef.current;
      }
    };
    const onTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || pinchStart <= 0) return;
      event.preventDefault();
      const midX = (event.touches[0].clientX + event.touches[1].clientX) / 2;
      const midY = (event.touches[0].clientY + event.touches[1].clientY) / 2;
      zoomAt(pinchZoom * (distance(event.touches) / pinchStart), midX, midY);
    };
    const onWheel = (event: WheelEvent) => {
      if (!event.ctrlKey) return;
      event.preventDefault();
      zoomAt(zoomRef.current * Math.exp(-event.deltaY * 0.01), event.clientX, event.clientY);
    };
    let gestureZoom = zoomRef.current;
    const onGestureStart = (event: Event) => {
      event.preventDefault();
      gestureZoom = zoomRef.current;
    };
    const onGestureChange = (event: Event) => {
      event.preventDefault();
      const scale = "scale" in event && typeof event.scale === "number" ? event.scale : 1;
      const point = event as Event & { clientX?: number; clientY?: number };
      zoomAt(gestureZoom * scale, point.clientX ?? 0, point.clientY ?? 0);
    };
    scroller.addEventListener("touchstart", onTouchStart, { passive: true });
    scroller.addEventListener("touchmove", onTouchMove, { passive: false });
    scroller.addEventListener("wheel", onWheel, { passive: false });
    scroller.addEventListener("gesturestart", onGestureStart, { passive: false });
    scroller.addEventListener("gesturechange", onGestureChange, { passive: false });
    return () => {
      scroller.removeEventListener("touchstart", onTouchStart);
      scroller.removeEventListener("touchmove", onTouchMove);
      scroller.removeEventListener("wheel", onWheel);
      scroller.removeEventListener("gesturestart", onGestureStart);
      scroller.removeEventListener("gesturechange", onGestureChange);
    };
  }, [session?.id]);

  useLayoutEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const pin = (scroller as HTMLDivElement & { _pin?: { pageX: number; pageY: number; vx: number; vy: number } })._pin;
    if (!pin) return;
    scroller.scrollLeft = pin.pageX * zoom - pin.vx;
    scroller.scrollTop = pin.pageY * zoom - pin.vy;
    delete (scroller as HTMLDivElement & { _pin?: unknown })._pin;
  }, [zoom]);

  function rememberPin(clientX: number, clientY: number, next: number) {
    const scroller = scrollerRef.current;
    if (!scroller) {
      setZoom(clamp(next, MIN_ZOOM, MAX_ZOOM));
      return;
    }
    const rect = scroller.getBoundingClientRect();
    const vx = clientX - rect.left;
    const vy = clientY - rect.top;
    (scroller as HTMLDivElement & { _pin?: { pageX: number; pageY: number; vx: number; vy: number } })._pin = {
      pageX: (scroller.scrollLeft + vx) / zoomRef.current,
      pageY: (scroller.scrollTop + vy) / zoomRef.current,
      vx,
      vy,
    };
    const clamped = clamp(next, MIN_ZOOM, MAX_ZOOM);
    zoomRef.current = clamped;
    setZoom(clamped);
  }

  function toPage(event: { clientX: number; clientY: number }): Point | null {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    if (rect.width < 1 || rect.height < 1) return null;
    return {
      x: ((event.clientX - rect.left) / rect.width) * PAGE_W,
      y: ((event.clientY - rect.top) / rect.height) * PAGE_H,
      p: 0.5,
    };
  }

  function samples(event: ReactPointerEvent<HTMLCanvasElement>): Point[] {
    const native = event.nativeEvent;
    const coalesced = typeof native.getCoalescedEvents === "function" ? native.getCoalescedEvents() : [native];
    const list = coalesced.length > 0 ? coalesced : [native];
    return list.flatMap((item) => {
      const point = toPage(item);
      if (!point) return [];
      const pressure = item.pointerType === "pen" ? clamp(item.pressure || 0.5, 0.05, 1) : 0.5;
      return [{ ...point, p: Math.round(pressure * 100) / 100 }];
    });
  }

  function tokenHit(slots: Session["slots"], x: number, y: number): { slot: SheetSlot; token: Token } | null {
    for (const slot of [...allSlots()].reverse()) {
      const transform = slotTransform(slot.rect, slot.view);
      const inside =
        x >= transform.rect.x && x <= transform.rect.x + transform.rect.w && y >= transform.rect.y && y <= transform.rect.y + transform.rect.h;
      if (!inside) continue;
      const tokens = [...slots[slot.id].tokens].reverse();
      for (const token of tokens) {
        const at = transform.toScreen(token.x, token.y);
        if (Math.hypot(at.x - x, at.y - y) <= tokenPx(transform.scale) * 0.62) return { slot: slot.id, token };
      }
    }
    return null;
  }

  function onPointerDown(event: ReactPointerEvent<HTMLCanvasElement>) {
    if (!session || event.pointerType === "touch") return;
    if (event.button !== 0 && event.button !== 5) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const drawn = samples(event);
    const point = drawn[0];
    if (!point) return;
    const erasing = mode === "erase" || event.button === 5;
    if (erasing) {
      const cleared = eraseAt(session.ink, session.slots, point.x, point.y);
      gestureRef.current = { kind: "erase", pointerId: event.pointerId, ...cleared };
      setPreview({ ...session, ink: cleared.ink, slots: cleared.slots });
      return;
    }
    if (mode === "token") {
      const court = courtAt(point.x, point.y);
      if (!court) return;
      const hit = tokenHit(session.slots, point.x, point.y);
      const slots = structuredClone(session.slots);
      if (hit && hit.slot === court.slot.id) {
        gestureRef.current = { kind: "token", pointerId: event.pointerId, slot: hit.slot, id: hit.token.id, slots, created: false, moved: false };
        return;
      }
      const meter = court.transform.toCourt(point.x, point.y);
      const kind = tokenKind;
      const token: Token = {
        id: uid(),
        kind,
        label: kind === "ball" ? "" : nextJersey(slots[court.slot.id].tokens, kind),
        color: kind === "defense" ? DEFENSE_COLOR : kind === "ball" ? BALL_FILL : ATTACK_COLOR,
        x: meter.x,
        y: meter.y,
      };
      slots[court.slot.id] = { ...slots[court.slot.id], tokens: [...slots[court.slot.id].tokens, token] };
      gestureRef.current = { kind: "token", pointerId: event.pointerId, slot: court.slot.id, id: token.id, slots, created: true, moved: false };
      setPreview({ ...session, slots });
      return;
    }
    const mark = SYMBOLS[symbol] ?? SYMBOLS[0];
    const court = mode === "mark" ? courtAt(point.x, point.y) : null;
    if (court) {
      const stroke: Stroke = {
        id: uid(),
        points: drawn.map((sample) => ({ ...court.transform.toCourt(sample.x, sample.y), p: sample.p })),
        color,
        width: width.meters,
        style: mark.style,
        cap: mark.cap,
      };
      gestureRef.current = { kind: "draw", pointerId: event.pointerId, space: "court", slot: court.slot.id, stroke };
      setLive({ space: "court", slot: court.slot.id, stroke });
      return;
    }
    const stroke: PageInk = {
      id: uid(),
      points: drawn,
      color,
      width: width.page,
      style: mode === "mark" ? mark.style : "solid",
      cap: mode === "mark" ? mark.cap : "none",
    };
    gestureRef.current = { kind: "draw", pointerId: event.pointerId, space: "page", stroke };
    setLive({ space: "page", stroke });
  }

  function onPointerMove(event: ReactPointerEvent<HTMLCanvasElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId || !session) return;
    const drawn = samples(event);
    const point = drawn[drawn.length - 1];
    if (!point) return;
    if (gesture.kind === "erase") {
      let ink = gesture.ink;
      let slots = gesture.slots;
      let changed = gesture.changed;
      for (const sample of drawn) {
        const step = eraseAt(ink, slots, sample.x, sample.y);
        ink = step.ink;
        slots = step.slots;
        changed = changed || step.changed;
      }
      gesture.ink = ink;
      gesture.slots = slots;
      gesture.changed = changed;
      setPreview({ ...session, ink, slots });
      return;
    }
    if (gesture.kind === "token") {
      const slot = allSlots().find((item) => item.id === gesture.slot);
      if (!slot) return;
      const transform = slotTransform(slot.rect, slot.view);
      const meter = transform.toCourt(point.x, point.y);
      gesture.slots = {
        ...gesture.slots,
        [gesture.slot]: {
          ...gesture.slots[gesture.slot],
          tokens: gesture.slots[gesture.slot].tokens.map((token) =>
            token.id === gesture.id ? { ...token, x: clamp(meter.x, -1, 30), y: clamp(meter.y, -1, 18) } : token,
          ),
        },
      };
      gesture.moved = true;
      setPreview({ ...session, slots: gesture.slots });
      return;
    }
    if (gesture.space === "court") {
      const slot = allSlots().find((item) => item.id === gesture.slot);
      if (!slot) return;
      const transform = slotTransform(slot.rect, slot.view);
      const extra = drawn.map((sample) => ({ ...transform.toCourt(sample.x, sample.y), p: sample.p }));
      gesture.stroke = { ...gesture.stroke, points: [...gesture.stroke.points, ...extra].slice(-2000) };
      setLive({ space: "court", slot: gesture.slot, stroke: gesture.stroke });
      return;
    }
    gesture.stroke = { ...gesture.stroke, points: [...gesture.stroke.points, ...drawn].slice(-2000) };
    setLive({ space: "page", stroke: gesture.stroke });
  }

  function finishPointer(event: ReactPointerEvent<HTMLCanvasElement>) {
    const gesture = gestureRef.current;
    if (!gesture || gesture.pointerId !== event.pointerId) return;
    gestureRef.current = null;
    setLive(null);
    setPreview(null);
    if (gesture.kind === "erase") {
      if (!gesture.changed) return;
      const ink = gesture.ink;
      const slots = gesture.slots;
      sessionApi.commitActive((current) => ({ ...current, ink, slots }));
      return;
    }
    if (gesture.kind === "token") {
      if (!gesture.created && !gesture.moved) return;
      const slots = gesture.slots;
      sessionApi.commitActive((current) => ({ ...current, slots }));
      return;
    }
    if (gesture.space === "court") {
      const points = simplifyPoints(gesture.stroke.points, 0.04).slice(0, 2000);
      const stroke = gesture.stroke;
      const slot = gesture.slot;
      sessionApi.commitActive((current) => ({
        ...current,
        slots: {
          ...current.slots,
          [slot]: { ...current.slots[slot], strokes: [...current.slots[slot].strokes, { ...stroke, points }].slice(-120) },
        },
      }));
      return;
    }
    const points = simplifyPoints(gesture.stroke.points, 0.7).slice(0, 2000);
    const stroke = gesture.stroke;
    sessionApi.commitActive((current) => ({ ...current, ink: [...current.ink, { ...stroke, points }].slice(-400) }));
  }

  if (!session) return null;
  const mark = SYMBOLS[symbol] ?? SYMBOLS[0];

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-2">
      <div
        ref={scrollerRef}
        className="min-h-0 flex-1 overflow-auto overscroll-contain p-3"
        style={{ touchAction: "pan-x pan-y" }}
      >
        <div className="relative mx-auto" style={{ width: PAGE_W * zoom, height: PAGE_H * zoom }}>
          <canvas
            ref={canvasRef}
            data-sheet="page"
            aria-label="Hoja de entrenamiento"
            className={cn("rounded-sm shadow-[0_18px_50px_rgba(0,0,0,0.35)]", mode === "erase" ? "cursor-cell" : "cursor-crosshair")}
            style={{ width: PAGE_W * zoom, height: PAGE_H * zoom, touchAction: "pan-x pan-y" }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={finishPointer}
            onPointerCancel={finishPointer}
          />
          <input
            aria-label="Título de la sesión"
            value={session.title}
            maxLength={80}
            onChange={(event) => sessionApi.patchActive({ title: event.target.value.slice(0, 80) })}
            className="absolute bg-transparent font-display font-semibold text-[#173454] outline-none"
            style={{
              left: (layout.header.x + 2) * zoom,
              top: (layout.header.y + 38) * zoom,
              width: (layout.header.w - 8) * zoom,
              height: Math.max(28, 32 * zoom),
              fontSize: Math.max(16, 22 * zoom),
            }}
          />
        </div>
      </div>
      <div className="glass flex flex-wrap items-center gap-1.5 rounded-3xl px-2 py-2">
        <ToolButton pressed={mode === "ink"} label="Lápiz" onClick={() => setMode("ink")}>
          <Pencil className="h-4 w-4" />
        </ToolButton>
        <ToolButton pressed={mode === "erase"} label="Goma" onClick={() => setMode("erase")}>
          <Eraser className="h-4 w-4" />
        </ToolButton>
        {PEN_COLORS.map((swatch) => (
          <button
            key={swatch.id}
            type="button"
            aria-label={swatch.label}
            aria-pressed={color === swatch.value}
            onClick={() => {
              setColor(swatch.value);
              if (mode === "erase" || mode === "token") setMode("ink");
            }}
            className={cn("h-8 w-8 shrink-0 rounded-full border", color === swatch.value ? "border-amber" : "border-white/30")}
            style={{ background: swatch.value }}
          />
        ))}
        {INK_WIDTHS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={widthId === item.id}
            onClick={() => setWidthId(item.id)}
            className={cn(
              "grid h-8 w-8 shrink-0 place-items-center rounded-full border",
              widthId === item.id ? "border-amber bg-amber/20" : "border-white/15 bg-white/5",
            )}
          >
            <span className="rounded-full bg-cream" style={{ width: Math.max(4, item.page), height: Math.max(4, item.page) }} />
          </button>
        ))}
        <ToolButton label="Deshacer" disabled={!sessionApi.canUndo} onClick={sessionApi.undo}>
          <Undo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Rehacer" disabled={!sessionApi.canRedo} onClick={sessionApi.redo}>
          <Redo2 className="h-4 w-4" />
        </ToolButton>
        <ToolButton label="Alejar" onClick={() => rememberPin(window.innerWidth / 2, window.innerHeight / 2, zoom / 1.2)}>
          <Minus className="h-4 w-4" />
        </ToolButton>
        <button
          type="button"
          className="h-8 shrink-0 rounded-full px-2 text-xs font-semibold text-cream"
          onClick={() => {
            const scroller = scrollerRef.current;
            if (!scroller) return;
            const styles = getComputedStyle(scroller);
            const padX = Number.parseFloat(styles.paddingLeft) + Number.parseFloat(styles.paddingRight);
            const padY = Number.parseFloat(styles.paddingTop) + Number.parseFloat(styles.paddingBottom);
            const fit = Math.min(
              (scroller.clientWidth - padX) / PAGE_W,
              (scroller.clientHeight - padY - 12) / PAGE_H,
            );
            rememberPin(window.innerWidth / 2, window.innerHeight / 2, fit);
          }}
        >
          {Math.round(zoom * 100)}%
        </button>
        <ToolButton label="Acercar" onClick={() => rememberPin(window.innerWidth / 2, window.innerHeight / 2, zoom * 1.2)}>
          <Plus className="h-4 w-4" />
        </ToolButton>
        <span className="mx-1 h-6 w-px shrink-0 bg-white/15" />
        {SYMBOLS.map((item, index) => (
          <ToolButton
            key={item.label}
            pressed={mode === "mark" && symbol === index}
            label={item.label}
            onClick={() => {
              setSymbol(index);
              setMode("mark");
            }}
          >
            {item.label}
          </ToolButton>
        ))}
        <span className="mx-1 h-6 w-px shrink-0 bg-white/15" />
        {(
          [
            ["attack", "Ataque"],
            ["defense", "Defensa"],
            ["ball", "Balón"],
          ] as const
        ).map(([kind, label]) => (
          <ToolButton
            key={kind}
            pressed={mode === "token" && tokenKind === kind}
            label={label}
            onClick={() => {
              setTokenKind(kind);
              setMode("token");
            }}
          >
            {label}
          </ToolButton>
        ))}
        <span className="hidden shrink-0 px-2 text-[11px] text-muted sm:inline">
          {mode === "mark" ? mark.label : "El lápiz escribe. El dedo mueve la hoja."}
        </span>
      </div>
    </div>
  );
}

function ToolButton({
  children,
  pressed,
  disabled,
  label,
  onClick,
}: {
  children: ReactNode;
  pressed?: boolean;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex h-8 shrink-0 items-center gap-1 rounded-full px-2.5 text-xs font-semibold disabled:opacity-40",
        pressed ? "bg-amber text-white" : "border border-white/15 bg-white/5 text-cream",
      )}
    >
      {children}
    </button>
  );
}
