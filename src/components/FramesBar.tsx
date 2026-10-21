import { ChevronLeft, ChevronRight, Pause, Play, Plus, Trash2 } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useBoard, usePlayback } from "@/state/board-context";

export function FramesBar() {
  const board = useBoard();
  const play = usePlayback();
  const total = board.state.doc.frames.length;
  const index = play.playing ? Math.min(play.index, total - 1) : board.state.doc.frameIndex;
  return (
    <div className="glass-solid pointer-events-auto flex items-center gap-1 rounded-full px-1.5 py-1">
      <IconButton label="Paso anterior" disabled={index <= 0 || play.playing} onClick={() => board.setFrame(index - 1)}>
        <ChevronLeft className="h-5 w-5" />
      </IconButton>
      <span className="min-w-14 text-center text-sm tabular-nums" aria-label={`Paso ${index + 1} de ${total}`}>
        {index + 1} / {total}
      </span>
      <IconButton
        label="Paso siguiente"
        disabled={index >= total - 1 || play.playing}
        onClick={() => board.setFrame(index + 1)}
      >
        <ChevronRight className="h-5 w-5" />
      </IconButton>
      <span className="mx-1 h-6 w-px bg-white/15" />
      <IconButton label="Nuevo paso" onClick={board.addFrame}>
        <Plus className="h-5 w-5" />
      </IconButton>
      <IconButton label="Borrar paso" disabled={total <= 1 || play.playing} onClick={board.deleteFrame}>
        <Trash2 className="h-5 w-5" />
      </IconButton>
      <IconButton label={play.playing ? "Pausa" : "Reproducir"} disabled={total < 2} onClick={board.togglePlayback}>
        {play.playing ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
      </IconButton>
      {play.playing && (
        <span className="mr-2 h-1 w-10 overflow-hidden rounded-full bg-white/15">
          <span className="block h-full bg-amber" style={{ width: `${Math.round(play.t * 100)}%` }} />
        </span>
      )}
    </div>
  );
}

function IconButton({
  label,
  disabled,
  onClick,
  children,
}: {
  label: string;
  disabled?: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <Button variant="ghost" size="touch" className="h-11 w-11" aria-label={label} disabled={disabled} onClick={onClick}>
      {children}
    </Button>
  );
}
