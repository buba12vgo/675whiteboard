import { Menu, Plus } from "lucide-react";
import { useEffect, useState } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Board } from "@/components/Board";
import { FramesBar } from "@/components/FramesBar";
import { DeletePlayDialog, NewPlayDialog, PlayFormDialog, PlaysDialog } from "@/components/PlaysDialog";
import { Toolbar } from "@/components/Toolbar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/state/auth-context";
import { BoardProvider, useBoard } from "@/state/board-context";

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const auth = useAuth();
  if (!auth.ready) {
    return (
      <div className="grid h-full place-items-center bg-ink">
        <div className="text-center">
          <p className="font-display text-5xl italic text-cream">Pizarra</p>
          <p className="mt-2 text-sm text-muted">Comprobando la cuenta…</p>
        </div>
      </div>
    );
  }
  if (!auth.user) return <AuthScreen />;
  return (
    <BoardProvider key={auth.user.uid} userId={auth.user.uid}>
      <Shell />
    </BoardProvider>
  );
}

function Shell() {
  const board = useBoard();
  const auth = useAuth();
  const mode = useLayoutMode();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
      }
      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();
      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) board.redo();
        else board.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        board.redo();
        return;
      }
      if (event.key === " ") {
        event.preventDefault();
        board.togglePlayback();
        return;
      }
      if (event.key === "[") board.setFrame(board.state.doc.frameIndex - 1);
      if (event.key === "]") board.setFrame(board.state.doc.frameIndex + 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [board]);

  if (!board.ready) {
    return (
      <div className="grid h-full place-items-center bg-ink">
        <div className="text-center">
          <p className="font-display text-5xl italic text-cream">Pizarra</p>
          <p className="mt-2 text-sm text-muted">Preparando el campo…</p>
        </div>
      </div>
    );
  }

  const meta = board.state.doc.meta;
  const label = meta?.name ?? "Borrador";

  return (
    <div className="flex h-full w-full bg-ink text-cream">
      <h1 className="sr-only">Pizarra táctica de baloncesto</h1>
      {mode === "rail" && board.toolbarOpen && <Toolbar mode="rail" />}
      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="relative min-h-0 flex-1">
          <Board />
          <div className="pointer-events-none absolute inset-x-0 top-[max(0.55rem,env(safe-area-inset-top))] z-20 grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 px-[max(0.55rem,env(safe-area-inset-left))] pr-[max(0.55rem,env(safe-area-inset-right))]">
          <button
            type="button"
            onClick={board.askNewPlay}
            aria-label="Nueva jugada"
            className="pointer-events-auto inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber px-3 py-1.5 text-sm font-semibold text-ink shadow-lg"
          >
            <Plus className="h-4 w-4" />
            <span className="sm:hidden">Nueva</span>
            <span className="hidden sm:inline">Nueva jugada</span>
          </button>
          <button
            type="button"
            onClick={board.openSave}
            className="pointer-events-auto mx-auto flex min-w-0 max-w-full items-center gap-2 rounded-full border border-white/10 bg-ink/75 px-3 py-1.5 text-sm shadow-lg backdrop-blur"
          >
            <span className="truncate font-medium">{label}</span>
            {meta && (
              <span className="text-xs text-muted">{meta.category === "jugada" ? "Jugada" : "Ejercicio"}</span>
            )}
            {board.dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-label="Cambios sin guardar" />}
          </button>
          <button
            type="button"
            onClick={() => void auth.signOutUser()}
            title={auth.user?.email ?? "Salir"}
            className="pointer-events-auto max-w-[28vw] shrink-0 truncate rounded-full border border-white/10 bg-ink/75 px-3 py-1.5 text-sm text-muted shadow-lg backdrop-blur"
          >
            Salir
          </button>
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-[max(0.55rem,env(safe-area-inset-bottom))] z-20 flex justify-center px-3">
            <FramesBar />
          </div>
          {!board.toolbarOpen && (
            <Button
              variant="outline"
              size="touch"
              aria-label="Mostrar herramientas"
              className={cn(
                "absolute z-30 bg-panel shadow-xl",
                mode === "rail"
                  ? "left-3 top-[max(0.7rem,env(safe-area-inset-top))]"
                  : "bottom-[max(0.7rem,env(safe-area-inset-bottom))] left-3",
              )}
              onClick={() => board.setToolbarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
          )}
        </div>
        {mode === "dock" && board.toolbarOpen && <Toolbar mode="dock" />}
      </div>
      <PlaysDialog />
      <PlayFormDialog />
      <DeletePlayDialog />
      <NewPlayDialog />
      {board.toast && (
        <div className="pointer-events-none fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] left-1/2 z-[60] -translate-x-1/2 rounded-full bg-cream px-4 py-2 text-sm font-medium text-ink shadow-lg">
          {board.toast}
        </div>
      )}
    </div>
  );
}

function useLayoutMode() {
  const [mode, setMode] = useState<"rail" | "dock">("dock");
  useEffect(() => {
    const apply = () => {
      const wide = window.innerWidth >= 900 && window.innerWidth > window.innerHeight;
      setMode(wide ? "rail" : "dock");
    };
    apply();
    window.addEventListener("resize", apply);
    window.addEventListener("orientationchange", apply);
    return () => {
      window.removeEventListener("resize", apply);
      window.removeEventListener("orientationchange", apply);
    };
  }, []);
  return mode;
}
