import { useEffect, useState, type ReactNode } from "react";
import { AuthScreen } from "@/components/AuthScreen";
import { Board } from "@/components/Board";
import { FramesBar } from "@/components/FramesBar";
import { DeletePlayDialog, NewPlayDialog, PlayFormDialog, PlaysDialog } from "@/components/PlaysDialog";
import { NewChooserDialog, TeamDateDialog } from "@/components/SessionDialogs";
import { Toolbar } from "@/components/Toolbar";
import { TrainingSheet } from "@/components/TrainingSheet";
import { LOCAL_USER } from "@/lib/guest";
import { formatSessionDate } from "@/lib/session";
import { setLinkedAccount, syncLabel, useSyncStatus } from "@/lib/sync-status";
import { cn } from "@/lib/utils";
import { AuthProvider, useAuth } from "@/state/auth-context";
import { BoardProvider, useBoard } from "@/state/board-context";
import { SessionProvider, useSession } from "@/state/session-context";

export default function App() {
  return (
    <AuthProvider>
      <Gate />
    </AuthProvider>
  );
}

function Gate() {
  const auth = useAuth();
  const uid = auth.user?.uid ?? (auth.guest ? LOCAL_USER : null);
  const linked = Boolean(auth.user);
  useEffect(() => {
    setLinkedAccount(Boolean(uid) && linked);
  }, [linked, uid]);

  if (!uid && !auth.ready) {
    return (
      <div className="grid h-full place-items-center bg-ink">
        <div className="text-center">
          <p className="font-display text-4xl font-semibold tracking-tight text-cream">Pizarra</p>
          <p className="mt-2 text-sm text-muted">Comprobando la cuenta…</p>
        </div>
      </div>
    );
  }
  if (!uid) return <AuthScreen />;
  return (
    <BoardProvider key={uid} userId={uid} linked={linked}>
      <SessionProvider userId={uid} linked={linked}>
        <Shell />
      </SessionProvider>
    </BoardProvider>
  );
}

function Shell() {
  const board = useBoard();
  const session = useSession();
  const auth = useAuth();
  const mode = useLayoutMode();
  const sheet = session.active;

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
        if (sheet) {
          if (event.shiftKey) session.redo();
          else session.undo();
        } else if (event.shiftKey) board.redo();
        else board.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        if (sheet) session.redo();
        else board.redo();
        return;
      }
      if (sheet) return;
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
  }, [board, session, sheet]);

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
      <TopBar
        mode={mode}
        linked={Boolean(auth.user)}
        onSignOut={() => void auth.signOutUser()}
        onAccount={auth.leaveGuest}
        email={auth.user?.email}
      />
      <div className="flex min-h-0 min-w-0 flex-1 gap-2">
        {!sheet && mode === "rail" && board.toolbarOpen && <Toolbar mode="rail" />}
        <div className="relative flex min-h-0 min-w-0 flex-1">{sheet ? <TrainingSheet /> : <Board />}</div>
      </div>
      {!sheet && (
        <div className="flex justify-center">
          <FramesBar />
        </div>
      )}
      {!sheet && board.toolbarOpen && <Toolbar mode="dock" includeTools={mode === "dock"} />}
      <PlaysDialog />
      <PlayFormDialog />
      <DeletePlayDialog />
      <NewPlayDialog />
      <NewChooserDialog />
      <TeamDateDialog />
      {(session.toast || board.toast) && (
        <div className="glass-solid pointer-events-none fixed bottom-24 left-1/2 z-[60] -translate-x-1/2 rounded-full px-4 py-2 text-sm font-medium text-cream">
          {session.toast ?? board.toast}
        </div>
      )}
    </div>
  );
}

function TopBar({
  mode,
  linked,
  onSignOut,
  onAccount,
  email,
}: {
  mode: "rail" | "dock";
  linked: boolean;
  onSignOut: () => void;
  onAccount: () => void;
  email?: string | null;
}) {
  const board = useBoard();
  const session = useSession();
  const meta = board.state.doc.meta;
  const sheet = session.active;
  const label = sheet ? sheet.title || "Sesión" : (meta?.name ?? "Borrador");
  const wide = mode === "rail";

  return (
    <header className="glass flex flex-col gap-2 rounded-3xl px-2 py-2 sm:px-3">
      <div className="toolbar-scroll flex items-center gap-1.5 overflow-x-auto">
        <img src="/icons/apple-touch-icon.png" alt="" width={32} height={32} className="h-8 w-8 shrink-0 rounded-md" />
        <button
          type="button"
          onClick={() => {
            if (!sheet) board.openSave();
          }}
          className="min-w-0 flex-1 text-left sm:flex-none sm:max-w-[16rem]"
        >
          <span className="block truncate font-display text-base font-semibold tracking-tight">{label}</span>
          <span className="flex items-center gap-1.5 text-[11px] text-muted">
            {sheet
              ? `${sheet.teamName} · ${formatSessionDate(sheet.date, "short")}`
              : meta
                ? meta.category === "jugada"
                  ? "Jugada"
                  : "Ejercicio"
                : "Sin guardar"}
            {(sheet ? session.dirty : board.dirty) && (
              <span className="h-1.5 w-1.5 rounded-full bg-amber" aria-label="Cambios sin guardar" />
            )}
          </span>
        </button>
        {wide && <CourtControls />}
        <div className="ml-auto flex shrink-0 items-center gap-1.5">
          {!sheet && !board.toolbarOpen && (
            <BarButton onClick={() => board.setToolbarOpen(true)}>Herramientas</BarButton>
          )}
          <BarButton onClick={() => session.setChooserOpen(true)}>Nueva</BarButton>
          <BarButton
            pressed={board.playsOpen}
            onClick={() => {
              void session.saveActive().finally(() => board.setPlaysOpen(true));
            }}
          >
            Biblioteca
          </BarButton>
          <BarButton
            tone="primary"
            onClick={() => {
              if (sheet) void session.saveActive(true);
              else board.openSave();
            }}
          >
            Guardar
          </BarButton>
          <SyncPill />
          {linked ? (
            <BarButton onClick={onSignOut} title={email ?? "Salir"}>
              Salir
            </BarButton>
          ) : (
            <BarButton onClick={onAccount} title="Entrar con una cuenta">
              Cuenta
            </BarButton>
          )}
        </div>
      </div>
      {!wide && <CourtControls />}
    </header>
  );
}

function CourtControls() {
  const board = useBoard();
  const session = useSession();
  const sheet = session.active;
  const court = sheet?.court ?? board.state.doc.court;
  const view = board.state.doc.view;
  const setCourt = (next: "fiba" | "mini") => {
    board.setCourt(next);
    if (sheet) session.patchActive({ court: next });
  };
  const setView = (next: "half" | "full") => {
    if (view !== next) board.toggleView();
  };
  return (
    <div className="toolbar-scroll flex min-w-0 items-center gap-1.5 overflow-x-auto">
      <Segment>
        <SegButton pressed={court === "fiba"} onClick={() => setCourt("fiba")}>
          FIBA 6,75
        </SegButton>
        <SegButton pressed={court === "mini"} onClick={() => setCourt("mini")}>
          Minibasket
        </SegButton>
      </Segment>
      {!sheet && (
        <Segment>
          <SegButton pressed={view === "half"} onClick={() => setView("half")}>
            Media pista
          </SegButton>
          <SegButton pressed={view === "full"} onClick={() => setView("full")}>
            Pista entera
          </SegButton>
        </Segment>
      )}
    </div>
  );
}

function SyncPill() {
  const status = useSyncStatus();
  const label = syncLabel(status);
  const dot = !status.online ? "bg-amber" : !status.linked ? "bg-cream/50" : status.pending ? "bg-amber" : "bg-emerald-400";
  return (
    <span role="status" aria-live="polite" className="inline-flex h-8 shrink-0 items-center gap-1.5 px-1 text-[11px] text-muted">
      <span className={cn("h-1.5 w-1.5 rounded-full", dot)} />
      {label}
    </span>
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
