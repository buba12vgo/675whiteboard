import * as Popover from "@radix-ui/react-popover";
import {
  ChevronDown,
  ChevronLeft,
  Eraser,
  Hand,
  ImageDown,
  Library,
  Pencil,
  Redo2,
  Trash2,
  Undo2,
} from "lucide-react";
import type { ReactNode, Ref } from "react";
import { IconArrow, IconAssist, IconDashed, IconDribble, IconFullCourt, IconHalfCourt, IconNone, IconShot, IconSolid, IconTee } from "@/components/icons";
import { COURT_FLOORS, FLAT_COLORS, type CourtFloor } from "@/lib/court";
import { Button } from "@/components/ui/button";
import { ROSTER } from "@/lib/tokens";
import { PEN_COLORS, WIDTHS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBoard } from "@/state/board-context";
import { TokenMark } from "@/components/token-mark";

export function Toolbar({ mode }: { mode: "rail" | "dock" }) {
  const board = useBoard();
  const horizontal = mode === "dock";
  const side = horizontal ? "top" : "right";
  const frame = board.state.doc.frames[board.state.doc.frameIndex];
  const styleIcon =
    board.lineStyle === "dashed" ? (
      <IconDashed />
    ) : board.lineStyle === "assist" ? (
      <IconAssist />
    ) : board.lineStyle === "zigzag" ? (
      <IconDribble />
    ) : board.lineStyle === "shot" ? (
      <IconShot />
    ) : (
      <IconSolid />
    );

  return (
    <div
      className={cn(
        "z-30 flex border-line bg-panel/95",
        horizontal
          ? "w-full shrink-0 border-t pb-[max(0.25rem,env(safe-area-inset-bottom))]"
          : "h-full w-[76px] shrink-0 flex-col border-r pt-[max(0.4rem,env(safe-area-inset-top))] pb-[max(0.4rem,env(safe-area-inset-bottom))]",
      )}
    >
      <div
        className={cn(
          "toolbar-scroll flex items-center",
          horizontal ? "gap-1 overflow-x-auto px-2 py-1.5" : "min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-2 py-1",
        )}
      >
        <ToolButton label="Lápiz" pressed={board.tool === "draw"} onClick={() => board.setTool("draw")}>
          <Pencil className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Goma" pressed={board.tool === "erase"} onClick={() => board.setTool("erase")}>
          <Eraser className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Mover fichas" pressed={board.tool === "move"} onClick={() => board.setTool("move")}>
          <Hand className="h-5 w-5" />
        </ToolButton>
        <Sep horizontal={horizontal} />
        <Popover.Root>
          <Popover.Trigger asChild>
            <ToolButton label="Color">
              <span className="h-6 w-6 rounded-full border border-white/30" style={{ background: board.color }} />
            </ToolButton>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side={side}
              sideOffset={10}
              className="z-50 grid grid-cols-4 gap-2 rounded-2xl border border-line bg-panel p-3 shadow-2xl"
            >
              {PEN_COLORS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-label={item.label}
                  onClick={() => board.setColor(item.value)}
                  className={cn(
                    "h-12 w-12 rounded-full border-2",
                    board.color === item.value ? "border-amber" : "border-white/20",
                  )}
                  style={{ background: item.value }}
                />
              ))}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger asChild>
            <ToolButton label="Tipo de trazo">{styleIcon}</ToolButton>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side={side}
              sideOffset={10}
              className="z-50 w-72 rounded-2xl border border-line bg-panel p-3 shadow-2xl"
            >
              <p className="px-1 pb-2 text-xs uppercase tracking-wide text-muted">Trazo</p>
              <div className="grid grid-cols-2 gap-2">
                <Choice pressed={board.lineStyle === "solid"} label="Sin balón" onClick={() => board.setLineStyle("solid")}>
                  <IconSolid />
                </Choice>
                <Choice pressed={board.lineStyle === "dashed"} label="Pase" onClick={() => board.setLineStyle("dashed")}>
                  <IconDashed />
                </Choice>
                <Choice pressed={board.lineStyle === "assist"} label="Asistencia" onClick={() => board.setLineStyle("assist")}>
                  <IconAssist />
                </Choice>
                <Choice pressed={board.lineStyle === "shot"} label="Tiro" onClick={() => board.setLineStyle("shot")}>
                  <IconShot />
                </Choice>
                <Choice pressed={board.lineStyle === "zigzag"} label="Con balón" onClick={() => board.setLineStyle("zigzag")}>
                  <IconDribble />
                </Choice>
              </div>
              <p className="px-1 pb-2 pt-3 text-xs uppercase tracking-wide text-muted">Final</p>
              <div className="grid grid-cols-3 gap-2">
                <Choice pressed={board.cap === "none"} label="Libre" onClick={() => board.setCap("none")}>
                  <IconNone />
                </Choice>
                <Choice pressed={board.cap === "arrow"} label="Flecha" onClick={() => board.setCap("arrow")}>
                  <IconArrow />
                </Choice>
                <Choice pressed={board.cap === "tee"} label="Bloqueo" onClick={() => board.setCap("tee")}>
                  <IconTee />
                </Choice>
              </div>
              <p className="px-1 pb-2 pt-3 text-xs uppercase tracking-wide text-muted">Grosor</p>
              <div className="grid grid-cols-3 gap-2">
                {WIDTHS.map((item) => (
                  <Choice
                    key={item.id}
                    pressed={Math.abs(board.width - item.meters) < 0.001}
                    label={item.label}
                    onClick={() => board.setWidth(item.meters)}
                  >
                    <span className="block rounded-full bg-cream" style={{ width: 18, height: 4 + WIDTHS.indexOf(item) * 4 }} />
                  </Choice>
                ))}
              </div>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Sep horizontal={horizontal} />
        <ToolButton label="Deshacer" disabled={!board.canUndo} onClick={board.undo}>
          <Undo2 className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Rehacer" disabled={!board.canRedo} onClick={board.redo}>
          <Redo2 className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Limpiar trazos" disabled={frame.strokes.length === 0} onClick={board.clearStrokes}>
          <Trash2 className="h-5 w-5" />
        </ToolButton>
        <Sep horizontal={horizontal} />
        <ToolButton
          label={board.state.doc.view === "half" ? "Campo entero" : "Medio campo"}
          onClick={board.toggleView}
        >
          {board.state.doc.view === "half" ? <IconHalfCourt /> : <IconFullCourt />}
        </ToolButton>
        <ToolButton label="Línea de 6,25" pressed={board.showThree} onClick={() => board.setShowThree(!board.showThree)}>
          <span className="text-[11px] font-bold leading-none">6,25</span>
        </ToolButton>
        <Popover.Root>
          <Popover.Trigger asChild>
            <ToolButton label="Fondo">
              <FloorSwatch floor={board.floor} flatColor={board.flatColor} />
            </ToolButton>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side={side}
              sideOffset={10}
              className="z-50 w-72 rounded-2xl border border-line bg-panel p-3 shadow-2xl"
            >
              <p className="px-1 pb-2 text-xs uppercase tracking-wide text-muted">Fondo</p>
              <div className="grid grid-cols-2 gap-2">
                {COURT_FLOORS.map((item) => (
                  <Choice
                    key={item.id}
                    pressed={board.floor === item.id}
                    label={item.label}
                    onClick={() => board.setFloor(item.id)}
                  >
                    <FloorSwatch floor={item.id} flatColor={board.flatColor} />
                  </Choice>
                ))}
              </div>
              {board.floor === "flat" && (
                <>
                  <p className="px-1 pb-2 pt-3 text-xs uppercase tracking-wide text-muted">Color</p>
                  <div className="grid grid-cols-6 gap-2">
                    {FLAT_COLORS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        aria-label={item.label}
                        onClick={() => board.setFlatColor(item.value)}
                        className={cn(
                          "h-9 w-9 rounded-full border-2",
                          board.flatColor === item.value ? "border-amber" : "border-white/25",
                        )}
                        style={{ background: item.value }}
                      />
                    ))}
                  </div>
                </>
              )}
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <Popover.Root>
          <Popover.Trigger asChild>
            <ToolButton label="Fichas">
              <span className="text-sm font-bold">5</span>
            </ToolButton>
          </Popover.Trigger>
          <Popover.Portal>
            <Popover.Content
              side={side}
              sideOffset={10}
              className="z-50 w-72 rounded-2xl border border-line bg-panel p-3 shadow-2xl"
            >
              <div className="plays-scroll max-h-[70dvh] overflow-y-auto pr-1">
                <RosterGroup title="Ataque" ids={ROSTER.filter((item) => item.kind === "attack").map((item) => item.id)} />
                <RosterGroup title="Defensa" ids={ROSTER.filter((item) => item.kind === "defense").map((item) => item.id)} />
                <RosterGroup title="Balón" ids={["ball"]} />
                <RosterGroup title="Material" ids={["obstacle"]} />
              </div>
              <Button variant="outline" className="mt-3 w-full" onClick={board.resetTokens}>
                Recolocar 5c5
              </Button>
            </Popover.Content>
          </Popover.Portal>
        </Popover.Root>
        <ToolButton label="Jugadas" pressed={board.playsOpen} onClick={() => board.setPlaysOpen(true)}>
          <Library className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Exportar imagen" onClick={board.exportPng}>
          <ImageDown className="h-5 w-5" />
        </ToolButton>
        <ToolButton label="Ocultar herramientas" onClick={() => board.setToolbarOpen(false)}>
          {horizontal ? <ChevronDown className="h-5 w-5" /> : <ChevronLeft className="h-5 w-5" />}
        </ToolButton>
      </div>
    </div>
  );
}

function RosterGroup({ title, ids }: { title: string; ids: string[] }) {
  const board = useBoard();
  const frame = board.state.doc.frames[board.state.doc.frameIndex];
  return (
    <div className="mb-2">
      <p className="px-1 py-1 text-xs uppercase tracking-wide text-muted">{title}</p>
      {ids.map((id) => {
        const entry = ROSTER.find((item) => item.id === id)!;
        const on = frame.tokens.some((token) => token.id === id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => board.toggleRosterToken(id)}
            className="flex h-12 w-full items-center gap-3 rounded-xl px-2 text-left hover:bg-white/5"
          >
            <TokenMark
              token={{ id: entry.id, kind: entry.kind, label: entry.label, color: entry.color, x: 0, y: 0 }}
              size={32}
            />
            <span className="flex-1 text-sm">
              {entry.kind === "ball" ? "Balón" : entry.kind === "obstacle" ? "Obstáculo" : entry.label}
            </span>
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-md border text-xs",
                on ? "border-amber bg-amber text-ink" : "border-line text-transparent",
              )}
            >
              ✓
            </span>
          </button>
        );
      })}
    </div>
  );
}

function FloorSwatch({ floor, flatColor }: { floor: CourtFloor; flatColor: string }) {
  const style =
    floor === "parquet-light"
      ? { background: "repeating-linear-gradient(90deg, #f3ddb4 0 3px, #e8c48c 3px 6px, #deb67a 6px 9px)" }
      : floor === "parquet-dark"
        ? { background: "repeating-linear-gradient(90deg, #7c5230 0 3px, #4c3016 3px 6px, #6e4524 6px 9px)" }
        : floor === "dark"
          ? { background: "#1a2330" }
          : floor === "flat"
            ? { background: flatColor }
            : { background: "#f4efe4" };
  return <span className="h-6 w-6 rounded-md border border-white/40" style={style} />;
}

function Sep({ horizontal }: { horizontal: boolean }) {
  return <div className={cn("shrink-0 bg-line", horizontal ? "mx-1 h-8 w-px self-center" : "my-1 h-px w-8")} />;
}

function ToolButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
  ref,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <Button
      ref={ref}
      variant={pressed ? "default" : "ghost"}
      size="touch"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

function Choice({
  pressed,
  label,
  onClick,
  children,
}: {
  pressed: boolean;
  label: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex h-16 flex-col items-center justify-center gap-1 rounded-xl border text-xs",
        pressed ? "border-amber bg-amber text-ink" : "border-line bg-panel-2 text-cream",
      )}
    >
      {children}
      {label}
    </button>
  );
}
