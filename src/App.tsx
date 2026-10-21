import { useEffect, useState, type ReactNode } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Board } from "@/components/Board";
import { FramesBar } from "@/components/FramesBar";
import { DeletePlayDialog, NewPlayDialog, PlayFormDialog, PlaysDialog } from "@/components/PlaysDialog";
import { Toolbar } from "@/components/Toolbar";
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
          <p className="font-display text-4xl font-semibold tracking-tight text-cream">Pizarra</p>
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
          <p className="font-display text-4xl font-semibold tracking-tight text-cream">Pizarra</p>
          <p className="mt-2 text-sm text-muted">Preparando el campo…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col gap-2 bg-ink p-2 pt-[max(0.5rem,env(safe-area-inset-top))] pr-[max(0.5rem,env(safe-area-inset-right))] pb-[max(0.5rem,env(safe-area-inset-bottom))] pl-[max(0.5rem,env(safe-area-inset-left))] text-cream">
      <h1 className="sr-only">Pizarra táctica de baloncesto</h1>
      <TopBar mode={mode} onSignOut={() => void auth.signOutUser()} email={auth.user?.email} />
      <div className="flex min-h-0 min-w-0 flex-1 gap-2">
        {mode === "rail" && board.toolbarOpen && <Toolbar mode="rail" />}
        <div className="relative min-h-0 min-w-0 flex-1">
          <Board />
        </div>
      </div>
      <div className="flex justify-center">
        <FramesBar />
      </div>
      {board.toolbarOpen && <Toolbar mode="dock" includeTools={mode === "dock"} />}
      <PlaysDialog />
      <PlayFormDialog />
      <DeletePlayDialog />
      <NewPlayDialog />
      {board.toast && (
        <div className="glass-solid pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-cream">
          {board.toast}
        </div>
      )}
    </div>
  );
}

function TopBar({ mode, onSignOut, email }: { mode: "rail" | "dock"; onSignOut: () => void; email?: string | null }) {
  const board = useBoard();
  const meta = board.state.doc.meta;
  const label = meta?.name ?? "Borrador";
  const wide = mode === "rail";

  return (
    <header className="glass flex flex-col gap-2 rounded-3xl px-2 py-2 sm:px-3">
      <div className="toolbar-scroll flex items-center gap-1.5 overflow-x-auto">
        <img src="/icons/apple-touch-icon.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-md" />
        <button type="button" onClick={board.openSave} className="min-w-0 flex-1 text-left sm:flex-none sm:max-w-[16rem]">
          <span className="block truncate font-display text-base font-semibold tracking-tight">{label}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            {meta ? (meta.category === "jugada" ? "Jugada" : "Ejercicio") : "Sin guardar"}
            {board.dirty && <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-label="Cambios sin guardar" />}
          </span>
        </button>
        {wide && <CourtControls />}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {!board.toolbarOpen && (
            <BarButton onClick={() => board.setToolbarOpen(true)}>Herramientas</BarButton>
          )}
          <BarButton onClick={board.askNewPlay}>Nueva</BarButton>
          <BarButton pressed={board.playsOpen} onClick={() => board.setPlaysOpen(true)}>
            Biblioteca
          </BarButton>
          <BarButton tone="primary" onClick={board.openSave}>
            Guardar
          </BarButton>
          <BarButton onClick={onSignOut} title={email ?? "Salir"}>
            Salir
          </BarButton>
        </div>
      </div>
      {!wide && <CourtControls />}
    </header>
  );
}

function CourtControls() {
  const board = useBoard();
  const court = board.state.doc.court;
  const view = board.state.doc.view;
  const setView = (next: "half" | "full") => {
    if (view !== next) board.toggleView();
  };
  return (
    <div className="toolbar-scroll flex min-w-0 items-center gap-1.5 overflow-x-auto">
      <Segment>
        <SegButton pressed={court === "fiba"} onClick={() => board.setCourt("fiba")}>
          FIBA 6,75
        </SegButton>
        <SegButton pressed={court === "mini"} onClick={() => board.setCourt("mini")}>
          Minibasket
        </SegButton>
      </Segment>
      <Segment>
        <SegButton pressed={view === "half"} onClick={() => setView("half")}>
          Media pista
        </SegButton>
        <SegButton pressed={view === "full"} onClick={() => setView("full")}>
          Pista entera
        </SegButton>
      </Segment>
    </div>
  );
}

function Segment({ children }: { children: ReactNode }) {
  return <div className="flex shrink-0 rounded-full bg-black/25 p-0.5">{children}</div>;
}

function SegButton({
  pressed,
  onClick,
  children,
}: {
  pressed: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full px-2.5 text-xs font-semibold sm:h-9 sm:px-3 sm:text-sm",
        pressed ? "bg-amber text-white" : "text-cream/85 hover:bg-white/10",
      )}
    >
      {children}
    </button>
  );
}

function BarButton({
  children,
  onClick,
  pressed,
  tone,
  title,
}: {
  children: ReactNode;
  onClick: () => void;
  pressed?: boolean;
  tone?: "primary";
  title?: string;
}) {
  return (
    <button
      type="button"
      title={title}
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "h-8 shrink-0 rounded-full px-2.5 text-xs font-semibold sm:h-9 sm:px-3 sm:text-sm",
        tone === "primary" || pressed ? "bg-amber text-white" : "border border-white/15 bg-white/5 text-cream hover:bg-white/10",
      )}
    >
      {children}
    </button>
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
