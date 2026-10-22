import * as Popover from "@radix-ui/react-popover";
import { Eraser, Hand, ImageDown, Pencil, Redo2, Trash2, Undo2 } from "lucide-react";
import type { ReactNode, Ref } from "react";
import { IconArrow, IconAssist, IconDashed, IconDribble, IconHandoff, IconNone, IconShot, IconSolid, IconTee } from "@/components/icons";
import { COURT_FLOORS, FLAT_COLORS, type CourtFloor } from "@/lib/court";
import { DEFENSE_SCALE } from "@/lib/defense-mark";
import { ROLE_SWATCHES, roleColor } from "@/lib/presentation";
import { Button } from "@/components/ui/button";
import { ROSTER } from "@/lib/tokens";
import { PEN_COLORS, WIDTHS } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useBoard } from "@/state/board-context";
import { TokenMark } from "@/components/token-mark";

const popoverSurface =
  "z-50 rounded-3xl border border-white/15 bg-[#0d1b2e]/95 p-3 text-cream shadow-[0_12px_40px_rgba(0,0,0,0.35)]";

export function Toolbar({ mode, includeTools = false }: { mode: "rail" | "dock"; includeTools?: boolean }) {
  const board = useBoard();
  const horizontal = mode === "dock";
  const side = horizontal ? "top" : "right";
  const frame = board.state.doc.frames[board.state.doc.frameIndex];
  const styleIcon =
    board.lineStyle === "dashed" ? (
      <IconDashed />
    ) : board.lineStyle === "assist" ? (
      <IconAssist />
    ) : board.lineStyle === "handoff" ? (
      <IconHandoff />
    ) : board.lineStyle === "zigzag" ? (
      <IconDribble />
    ) : board.lineStyle === "shot" ? (
      <IconShot />
    ) : (
      <IconSolid />
    );

  const attackFull = ROSTER.filter((item) => item.kind === "attack").every((item) =>
    frame.tokens.some((token) => token.id === item.id),
  );
  const defenseFull = ROSTER.filter((item) => item.kind === "defense").every((item) =>
    frame.tokens.some((token) => token.id === item.id),
  );
  const ballOn = frame.tokens.some((token) => token.id === "ball");

  function addKind(kind: "attack" | "defense") {
    const missing = ROSTER.find((item) => item.kind === kind && !frame.tokens.some((token) => token.id === item.id));
    if (missing) board.toggleRosterToken(missing.id);
  }

  const tools = (
    <>
      <PaletteButton label="Lápiz" pressed={board.tool === "draw"} onClick={() => board.setTool("draw")} horizontal={horizontal}>
        <Pencil className="h-5 w-5" />
      </PaletteButton>
      <PaletteButton label="Goma" pressed={board.tool === "erase"} onClick={() => board.setTool("erase")} horizontal={horizontal}>
        <Eraser className="h-5 w-5" />
      </PaletteButton>
      <PaletteButton
        label="Mover"
        pressed={board.tool === "move"}
        onClick={() => board.setTool("move")}
        horizontal={horizontal}
      >
        <Hand className="h-5 w-5" />
      </PaletteButton>
      <Popover.Root>
        <Popover.Trigger asChild>
          <PaletteButton label="Trazo" horizontal={horizontal}>
            {styleIcon}
          </PaletteButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side={side} sideOffset={10} className={cn(popoverSurface, "w-72")}>
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Trazo</p>
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
              <Choice pressed={board.lineStyle === "handoff"} label="Mano a mano" onClick={() => board.setLineStyle("handoff")}>
                <IconHandoff />
              </Choice>
              <Choice pressed={board.lineStyle === "shot"} label="Tiro" onClick={() => board.setLineStyle("shot")}>
                <IconShot />
              </Choice>
              <Choice pressed={board.lineStyle === "zigzag"} label="Con balón" onClick={() => board.setLineStyle("zigzag")}>
                <IconDribble />
              </Choice>
            </div>
            <p className="px-1 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Final</p>
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
            <p className="px-1 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Grosor</p>
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
      <Popover.Root>
        <Popover.Trigger asChild>
          <PaletteButton label="Fondo" horizontal={horizontal}>
            <FloorSwatch floor={board.floor} flatColor={board.flatColor} />
          </PaletteButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side={side} sideOffset={10} className={cn(popoverSurface, "w-72")}>
            <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-muted">Fondo</p>
            <div className="grid grid-cols-2 gap-2">
              {COURT_FLOORS.map((item) => (
                <Choice key={item.id} pressed={board.floor === item.id} label={item.label} onClick={() => board.setFloor(item.id)}>
                  <FloorSwatch floor={item.id} flatColor={board.flatColor} />
                </Choice>
              ))}
            </div>
            {board.floor === "flat" && (
              <>
                <p className="px-1 pb-2 pt-3 text-xs font-semibold uppercase tracking-wide text-muted">Color</p>
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
          <PaletteButton label="Fichas" horizontal={horizontal}>
            <span className="text-sm font-bold">5</span>
          </PaletteButton>
        </Popover.Trigger>
        <Popover.Portal>
          <Popover.Content side={side} sideOffset={10} className={cn(popoverSurface, "w-72")}>
            <div className="plays-scroll max-h-[70dvh] overflow-y-auto pr-1">
              <div className="mb-2 space-y-2 border-b border-white/10 pb-3">
                <ColorPick title="Ataque" value={board.attackColor} onPick={board.setAttackColor} />
                <ColorPick title="Defensa" value={board.defenseColor} onPick={board.setDefenseColor} />
              </div>
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
      <PaletteButton label="Imagen" onClick={board.exportPng} horizontal={horizontal}>
        <ImageDown className="h-5 w-5" />
      </PaletteButton>
      <PaletteButton label="Ocultar" onClick={() => board.setToolbarOpen(false)} horizontal={horizontal}>
        <span className="text-sm font-semibold">–</span>
      </PaletteButton>
    </>
  );

  const actions = (
    <>
      <PaletteButton label="+ Ataque" pressed={attackFull} onClick={() => addKind("attack")} horizontal>
        <span className="text-base font-semibold leading-none">+1</span>
      </PaletteButton>
      <PaletteButton label="+ Defensa" pressed={defenseFull} onClick={() => addKind("defense")} horizontal>
        <span className="text-base font-semibold leading-none">+X</span>
      </PaletteButton>
      <PaletteButton label="Balón" pressed={ballOn} onClick={() => board.toggleRosterToken("ball")} horizontal>
        <TokenMark
          token={{ id: "ball", kind: "ball", label: "", color: "", x: 0, y: 0 }}
          size={18}
        />
      </PaletteButton>
      <span className={cn("shrink-0 bg-white/15", horizontal ? "mx-1 h-8 w-px" : "my-1 h-px w-8")} />
      <div className={cn("flex items-center gap-1", horizontal ? "px-0.5" : "flex-col")}>
        {PEN_COLORS.map((item) => (
          <button
            key={item.id}
            type="button"
            aria-label={item.label}
            aria-pressed={board.color === item.value}
            onClick={() => board.setColor(item.value)}
            className={cn(
              "h-7 w-7 shrink-0 rounded-full border-2",
              board.color === item.value ? "border-amber" : "border-white/25",
            )}
            style={{ background: item.value }}
          />
        ))}
      </div>
      <span className={cn("shrink-0 bg-white/15", horizontal ? "mx-1 h-8 w-px" : "my-1 h-px w-8")} />
      <PaletteButton label="Deshacer" disabled={!board.canUndo} onClick={board.undo} horizontal>
        <Undo2 className="h-5 w-5" />
      </PaletteButton>
      <PaletteButton label="Rehacer" disabled={!board.canRedo} onClick={board.redo} horizontal>
        <Redo2 className="h-5 w-5" />
      </PaletteButton>
      <PaletteButton label="Limpiar" disabled={frame.strokes.length === 0} onClick={board.clearStrokes} horizontal>
        <Trash2 className="h-5 w-5" />
      </PaletteButton>
    </>
  );

  if (mode === "rail") {
    return (
      <div className="glass toolbar-scroll flex w-[92px] shrink-0 flex-col gap-1 overflow-y-auto rounded-3xl px-1.5 py-2">
        {tools}
      </div>
    );
  }

  return (
    <div className="glass toolbar-scroll flex items-end gap-1 overflow-x-auto rounded-3xl px-2 py-1.5">
      {includeTools && tools}
      {actions}
    </div>
  );
}

function RosterGroup({ title, ids }: { title: string; ids: string[] }) {
  const board = useBoard();
  const frame = board.state.doc.frames[board.state.doc.frameIndex];
  return (
    <div className="mb-2">
      <p className="px-1 py-1 text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      {ids.map((id) => {
        const entry = ROSTER.find((item) => item.id === id)!;
        const on = frame.tokens.some((token) => token.id === id);
        return (
          <button
            key={id}
            type="button"
            onClick={() => board.toggleRosterToken(id)}
            className="flex h-12 w-full items-center gap-3 rounded-2xl px-2 text-left hover:bg-white/5"
          >
            <span className="grid h-12 w-12 shrink-0 place-items-center">
              <TokenMark
                token={{
                  id: entry.id,
                  kind: entry.kind,
                  label: entry.label,
                  color: roleColor(entry.kind, board.attackColor, board.defenseColor, entry.color),
                  x: 0,
                  y: 0,
                }}
                size={entry.kind === "defense" ? 30 * DEFENSE_SCALE : entry.kind === "ball" ? 22 : 30}
              />
            </span>
            <span className="flex-1 text-sm">
              {entry.kind === "ball" ? "Balón" : entry.kind === "obstacle" ? "Obstáculo" : entry.label}
            </span>
            <span
              className={cn(
                "grid h-6 w-6 place-items-center rounded-full border text-xs",
                on ? "border-amber bg-amber text-white" : "border-white/20 text-transparent",
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

function ColorPick({ title, value, onPick }: { title: string; value: string; onPick: (color: string) => void }) {
  return (
    <div className="flex items-center gap-2 px-1">
      <span className="w-16 text-xs font-semibold uppercase tracking-wide text-muted">{title}</span>
      <span className="flex flex-1 justify-between">
        {ROLE_SWATCHES.map((swatch) => {
          const on = value === swatch.value;
          return (
            <button
              key={swatch.id}
              type="button"
              aria-label={`${title} ${swatch.label}`}
              aria-pressed={on}
              onClick={() => onPick(swatch.value)}
              className={cn(
                "h-6 w-6 rounded-full",
                on ? "ring-2 ring-amber ring-offset-2 ring-offset-[#0d1b2e]" : "ring-1 ring-white/25",
              )}
              style={{ background: swatch.value }}
            />
          );
        })}
      </span>
    </div>
  );
}

function FloorSwatch({ floor, flatColor }: { floor: CourtFloor; flatColor: string }) {
  const style =
    floor === "parquet-light"
      ? { background: "repeating-linear-gradient(90deg, #f3e6d0 0 4px, #e7d4b6 4px 7px, #c9ae8c 7px 10px, #efe0c8 10px 14px)" }
      : floor === "parquet-dark"
        ? { background: "repeating-linear-gradient(90deg, #7c5230 0 3px, #4c3016 3px 6px, #6e4524 6px 9px)" }
        : floor === "dark"
          ? { background: "#1a2330" }
          : floor === "flat"
            ? { background: flatColor }
            : { background: "#f4efe4" };
  return <span className="h-6 w-6 rounded-md border border-white/40" style={style} />;
}

function PaletteButton({
  label,
  pressed,
  disabled,
  onClick,
  children,
  horizontal,
  ref,
}: {
  label: string;
  pressed?: boolean;
  disabled?: boolean;
  onClick?: () => void;
  children: ReactNode;
  horizontal?: boolean;
  ref?: Ref<HTMLButtonElement>;
}) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      aria-pressed={pressed}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex shrink-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1.5 py-1.5 text-[10px] font-semibold leading-none disabled:opacity-40",
        horizontal ? "min-w-14" : "w-full",
        pressed ? "bg-amber text-white" : "text-cream hover:bg-white/10",
      )}
    >
      {children}
      <span>{label}</span>
    </button>
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
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex min-h-16 flex-col items-center justify-center gap-1 rounded-2xl border px-1 py-2 text-center text-xs font-medium leading-tight",
        pressed ? "border-amber bg-amber text-white" : "border-white/15 bg-white/5 text-cream",
      )}
    >
      {children}
      {label}
    </button>
  );
}
