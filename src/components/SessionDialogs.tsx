import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label } from "@/components/ui/field";
import { findTeamByName, todayISO } from "@/lib/session";
import { cn, fold } from "@/lib/utils";
import { useBoard } from "@/state/board-context";
import { useSession } from "@/state/session-context";

export function NewChooserDialog() {
  const board = useBoard();
  const session = useSession();

  function choosePlay() {
    session.setChooserOpen(false);
    if (board.dirty) {
      board.askNewPlay();
      return;
    }
    void session.closeActive();
    board.askNewPlay();
  }

  function chooseTraining() {
    session.setChooserOpen(false);
    session.setTeamDialogOpen(true);
  }

  return (
    <Dialog open={session.chooserOpen} onOpenChange={session.setChooserOpen}>
      <DialogContent className="p-5">
        <DialogTitle className="pr-10 font-display text-3xl font-semibold tracking-tight">Nuevo</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted">
          Una jugada es un campo con pasos. Un entrenamiento es una hoja para la sesión.
        </DialogDescription>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={choosePlay}
            className="rounded-3xl border border-white/15 bg-white/5 p-4 text-left hover:bg-white/10"
          >
            <span className="font-display text-2xl font-semibold">Jugada</span>
            <span className="mt-1 block text-sm text-muted">Campo, pasos y fichas, como hasta ahora.</span>
          </button>
          <button
            type="button"
            onClick={chooseTraining}
            className="rounded-3xl border border-amber/50 bg-amber/15 p-4 text-left hover:bg-amber/25"
          >
            <span className="font-display text-2xl font-semibold">Entrenamiento</span>
            <span className="mt-1 block text-sm text-muted">Hoja con tres medias pistas, dos pistas enteras y sitio para notas.</span>
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TeamDateDialog() {
  const board = useBoard();
  const session = useSession();
  return (
    <Dialog open={session.teamDialogOpen} onOpenChange={session.setTeamDialogOpen}>
      <DialogContent className="p-5">
        {session.teamDialogOpen && <TeamDateForm key={session.teams.map((team) => team.id).join("-") || "nuevo"} courtLabel={board.state.doc.court} />}
      </DialogContent>
    </Dialog>
  );
}

function TeamDateForm({ courtLabel }: { courtLabel: "fiba" | "mini" }) {
  const board = useBoard();
  const session = useSession();
  const [teamId, setTeamId] = useState<string | null>(session.teams[0]?.id ?? null);
  const [custom, setCustom] = useState("");
  const [date, setDate] = useState(todayISO());
  const [pending, setPending] = useState(false);
  const selected = session.teams.find((team) => team.id === teamId) ?? null;
  const typed = custom.trim();
  const name = typed || selected?.name || "";
  const reuses = typed ? findTeamByName(session.teams, typed) : selected;
  const resolvedId = typed ? (reuses && fold(reuses.name) === fold(typed) ? reuses.id : null) : selected?.id ?? null;

  async function start() {
    if (!name || pending) return;
    setPending(true);
    try {
      await session.startSession({
        teamId: resolvedId,
        teamName: reuses && fold(reuses.name) === fold(name) ? reuses.name : name,
        date,
        court: board.state.doc.court,
      });
      board.setPlaysOpen(false);
    } finally {
      setPending(false);
    }
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        void start();
      }}
    >
      <DialogTitle className="pr-10 font-display text-3xl font-semibold tracking-tight">Entrenamiento</DialogTitle>
      <DialogDescription className="mt-2 text-sm text-muted">
        Elige el equipo y el día. Las pistas salen en {courtLabel === "mini" ? "minibasket" : "FIBA 6,75"}.
      </DialogDescription>
      <div className="mt-5 flex flex-col gap-4">
        <div>
          <Label htmlFor="equipo">Equipo</Label>
          {session.teams.length > 0 && (
            <div className="mt-2 flex max-h-36 flex-wrap gap-2 overflow-y-auto">
              {session.teams.map((team) => {
                const pressed = !typed && team.id === teamId;
                return (
                  <button
                    key={team.id}
                    type="button"
                    aria-pressed={pressed}
                    onClick={() => {
                      setTeamId(team.id);
                      setCustom("");
                    }}
                    className={cn(
                      "h-10 rounded-full border px-3 text-sm font-semibold",
                      pressed ? "border-amber bg-amber text-white" : "border-white/15 bg-white/5 text-cream",
                    )}
                  >
                    {team.name}
                  </button>
                );
              })}
            </div>
          )}
          <Input
            id="equipo"
            className="mt-2"
            value={custom}
            placeholder={session.teams.length > 0 ? "O escribe un equipo nuevo" : "Nombre del equipo"}
            aria-label="Nombre del equipo"
            maxLength={80}
            onChange={(event) => setCustom(event.target.value)}
          />
          {typed && reuses && <p className="mt-2 text-xs text-muted">Se usará el equipo ya guardado «{reuses.name}».</p>}
        </div>
        <div>
          <Label htmlFor="fecha">Fecha</Label>
          <Input
            id="fecha"
            className="mt-2 [color-scheme:dark]"
            type="date"
            value={date}
            required
            onChange={(event) => setDate(event.target.value)}
          />
        </div>
      </div>
      <div className="mt-5 flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => session.setTeamDialogOpen(false)}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!name || !date || pending}>
          Empezar
        </Button>
      </div>
    </form>
  );
}
