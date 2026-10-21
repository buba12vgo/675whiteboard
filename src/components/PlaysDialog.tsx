import { Copy, FolderOpen, Pencil, Trash2, Upload } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/field";
import { listPlays } from "@/lib/db";
import type { Category, Play } from "@/lib/types";
import { cn, fold, formatWhen } from "@/lib/utils";
import { useBoard } from "@/state/board-context";

export function PlaysDialog() {
  const board = useBoard();
  const [plays, setPlays] = useState<Play[]>([]);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<"todas" | Category>("todas");
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!board.playsOpen) return;
    let cancelled = false;
    listPlays()
      .then((items) => {
        if (!cancelled) setPlays(items);
      })
      .catch(() => {
        if (!cancelled) setPlays([]);
      });
    return () => {
      cancelled = true;
    };
  }, [board.playsOpen, board.playsVersion]);

  const needle = fold(query.trim());
  const visible = plays.filter((play) => {
    if (filter !== "todas" && play.category !== filter) return false;
    if (!needle) return true;
    return fold(`${play.name} ${play.notes}`).includes(needle);
  });

  return (
    <Dialog open={board.playsOpen} onOpenChange={board.setPlaysOpen}>
      <DialogContent className="flex max-h-[min(88dvh,820px)] flex-col overflow-hidden p-0">
        <div className="border-b border-line px-5 pb-4 pt-5 pr-14">
          <DialogTitle className="font-display text-3xl font-semibold tracking-tight">Biblioteca</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted">
            Jugadas y ejercicios guardados en este dispositivo.
          </DialogDescription>
        </div>
        <div className="flex flex-col gap-3 px-5 pt-4">
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Buscar por nombre o notas"
            aria-label="Buscar jugadas"
          />
          <div className="grid grid-cols-3 gap-2">
            {(
              [
                ["todas", "Todas"],
                ["jugada", "Jugadas"],
                ["ejercicio", "Ejercicios"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setFilter(id)}
                className={cn(
                  "h-10 rounded-full border text-sm font-semibold",
                  filter === id ? "border-amber bg-amber text-white" : "border-white/15 bg-white/5 text-cream",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        <div className="plays-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
          {visible.length === 0 ? (
            <div className="mx-2 my-6 rounded-3xl border border-dashed border-white/20 px-4 py-8 text-center">
              {plays.length === 0 ? (
                <>
                  <p className="font-medium">Todavía no hay nada por aquí</p>
                  <p className="mt-1 text-sm text-muted">
                    Dibuja en el campo y pulsa Guardar. Quedará en este iPad aunque no haya red.
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium">Ninguna coincide</p>
                  <p className="mt-1 text-sm text-muted">Prueba con otro nombre o cambia el filtro.</p>
                </>
              )}
            </div>
          ) : (
            <ul className="flex flex-col gap-2">
              {visible.map((play) => (
                <li key={play.id}>
                  <article className="rounded-3xl border border-white/15 bg-white/5 p-3">
                    <button type="button" className="w-full text-left" onClick={() => board.openPlay(play)}>
                      <div className="flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold">{play.name}</h3>
                        <span
                          className={cn(
                            "shrink-0 rounded-full px-2 py-0.5 text-xs",
                            play.category === "jugada" ? "bg-amber/20 text-amber" : "bg-white/10 text-cream",
                          )}
                        >
                          {play.category === "jugada" ? "Jugada" : "Ejercicio"}
                        </span>
                      </div>
                      <p className="mt-1 text-xs text-muted">
                        {play.frames.length === 1 ? "1 paso" : `${play.frames.length} pasos`}
                        {" · "}
                        {play.view === "half" ? "media pista" : "pista entera"}
                        {" · "}
                        {play.court === "mini" ? "minibasket" : "FIBA 6,75"}
                        {" · "}
                        {formatWhen(play.updatedAt)}
                      </p>
                      {play.notes && <p className="mt-2 line-clamp-2 text-sm text-muted">{play.notes}</p>}
                    </button>
                    <div className="mt-2 flex flex-wrap gap-1">
                      <Button variant="ghost" size="sm" aria-label={`Abrir ${play.name}`} onClick={() => board.openPlay(play)}>
                        <FolderOpen className="h-4 w-4" />
                        Abrir
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Renombrar ${play.name}`} onClick={() => board.openRename(play)}>
                        <Pencil className="h-4 w-4" />
                        Renombrar
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Duplicar ${play.name}`} onClick={() => void board.duplicatePlay(play)}>
                        <Copy className="h-4 w-4" />
                        Duplicar
                      </Button>
                      <Button variant="ghost" size="sm" aria-label={`Eliminar ${play.name}`} onClick={() => board.askDelete(play)}>
                        <Trash2 className="h-4 w-4" />
                        Eliminar
                      </Button>
                    </div>
                  </article>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="flex flex-col gap-2 border-t border-line p-3">
          <Button onClick={board.askNewPlay}>Nueva jugada</Button>
          <div className="grid grid-cols-3 gap-2">
          <Button variant="outline" onClick={board.openSave}>Guardar</Button>
          <Button variant="outline" onClick={() => void board.exportJson()}>
            Exportar
          </Button>
          <Button variant="outline" onClick={() => fileRef.current?.click()}>
            <Upload className="h-4 w-4" />
            Importar
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              if (!file) return;
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === "string") void board.importJson(reader.result);
              };
              reader.readAsText(file);
            }}
          />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PlayFormDialog() {
  const board = useBoard();
  const form = board.form;
  return (
    <Dialog open={form !== null} onOpenChange={(open) => !open && board.closeForm()}>
      <DialogContent>
        {form && <PlayForm key={form.mode === "rename" ? `rename-${form.play.id}` : "save"} />}
      </DialogContent>
    </Dialog>
  );
}

function PlayForm() {
  const board = useBoard();
  const form = board.form;
  const source = form?.mode === "rename" ? form.play : board.state.doc.meta;
  const [name, setName] = useState(source?.name ?? "");
  const [category, setCategory] = useState<Category>(source?.category ?? "jugada");
  const [notes, setNotes] = useState(source?.notes ?? "");
  const renaming = form?.mode === "rename";
  const canUpdate = !renaming && board.state.doc.meta !== null;

  return (
    <form
      className="flex flex-col gap-4 p-5"
      onSubmit={(event) => {
        event.preventDefault();
        void board.saveForm({ name, category, notes, asNew: renaming ? false : !canUpdate });
      }}
    >
      <div className="pr-10">
        <DialogTitle className="font-display text-2xl font-semibold tracking-tight">
          {renaming ? "Editar ficha" : "Guardar en la pizarra"}
        </DialogTitle>
        <DialogDescription className="mt-1 text-sm text-muted">
          {renaming ? "Cambia el nombre, la categoría o las notas." : "Se guarda en este dispositivo y funciona sin conexión."}
        </DialogDescription>
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="play-name">Nombre</Label>
        <Input
          id="play-name"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Horn, salida de fondo, 3c0…"
          maxLength={80}
          required
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        {(["jugada", "ejercicio"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setCategory(id)}
            className={cn(
              "h-12 rounded-full border font-semibold",
              category === id ? "border-amber bg-amber text-white" : "border-white/15 bg-white/5",
            )}
          >
            {id === "jugada" ? "Jugada" : "Ejercicio"}
          </button>
        ))}
      </div>
      <div className="flex flex-col gap-2">
        <Label htmlFor="play-notes">Notas</Label>
        <Textarea
          id="play-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          placeholder="Bloqueos, tiempos, a quién va el balón…"
          maxLength={2000}
        />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        {canUpdate && (
          <Button
            type="button"
            variant="outline"
            onClick={() => void board.saveForm({ name, category, notes, asNew: true })}
          >
            Guardar como nueva
          </Button>
        )}
        <Button type="submit">{renaming || canUpdate ? "Guardar cambios" : "Guardar"}</Button>
      </div>
    </form>
  );
}

export function NewPlayDialog() {
  const board = useBoard();
  const name = board.state.doc.meta?.name;
  return (
    <Dialog open={board.confirmNew} onOpenChange={(open) => !open && board.cancelNewPlay()}>
      <DialogContent className="p-5">
        <DialogTitle className="pr-10 font-display text-2xl font-semibold tracking-tight">Nueva jugada</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted">
          {name
            ? `«${name}» tiene cambios sin guardar. La copia guardada se queda como estaba y el campo empieza de cero.`
            : "Este borrador no está guardado. Si empiezas otra jugada, lo que hay ahora en el campo se pierde."}
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={board.cancelNewPlay}>
            Seguir aquí
          </Button>
          <Button onClick={board.commitNewPlay}>Empezar nueva</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function DeletePlayDialog() {
  const board = useBoard();
  const play = board.confirmDelete;
  return (
    <Dialog open={play !== null} onOpenChange={(open) => !open && board.cancelDelete()}>
      <DialogContent className="p-5">
        <DialogTitle className="pr-10 font-display text-2xl font-semibold tracking-tight">Eliminar jugada</DialogTitle>
        <DialogDescription className="mt-2 text-sm text-muted">
          {play ? `¿Eliminar «${play.name}»? No se puede deshacer. Lo que tengas ahora en el campo se queda.` : ""}
        </DialogDescription>
        <div className="mt-5 flex justify-end gap-2">
          <Button variant="outline" onClick={board.cancelDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={() => void board.confirmDeletePlay()}>
            Eliminar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
