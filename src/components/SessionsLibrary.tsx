import { Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { PAGE_H, PAGE_W, formatSessionDate, groupSessions, type Session } from "@/lib/session";
import { paintSheet } from "@/lib/sheet-paint";
import { fold } from "@/lib/utils";
import { useSession } from "@/state/session-context";

export function SessionsLibrary({ query }: { query: string }) {
  const sessionApi = useSession();
  const [pending, setPending] = useState<Session | null>(null);
  const needle = fold(query.trim());
  const visible = sessionApi.sessions.filter((session) => {
    if (!needle) return true;
    return fold(`${session.teamName} ${session.title}`).includes(needle);
  });
  const groups = groupSessions(visible);

  return (
    <>
      <div className="plays-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        {groups.length === 0 ? (
          <div className="mx-2 my-6 rounded-3xl border border-dashed border-white/20 px-4 py-8 text-center">
            {sessionApi.sessions.length === 0 ? (
              <>
                <p className="font-medium">Todavía no hay entrenamientos</p>
                <p className="mt-1 text-sm text-muted">En Nueva, elige Entrenamiento, el equipo y la fecha.</p>
              </>
            ) : (
              <>
                <p className="font-medium">Ninguno coincide</p>
                <p className="mt-1 text-sm text-muted">Prueba con el nombre del equipo o de la sesión.</p>
              </>
            )}
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <section key={group.teamId || group.teamName} aria-label={group.teamName}>
                <h3 className="px-2 font-display text-xl font-semibold tracking-tight">{group.teamName}</h3>
                <ul className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {group.items.map((session) => (
                    <li key={session.id}>
                      <article className="rounded-3xl border border-white/15 bg-white/5 p-2">
                        <button type="button" className="block w-full text-left" onClick={() => sessionApi.openSession(session)}>
                          <SessionThumb session={session} />
                          <span className="mt-2 block truncate text-sm font-semibold">{session.title}</span>
                          <span className="block text-xs text-muted">{formatSessionDate(session.date, "short")}</span>
                        </button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="mt-1 px-2"
                          aria-label={`Eliminar ${session.title}`}
                          onClick={() => setPending(session)}
                        >
                          <Trash2 className="h-4 w-4" />
                          Eliminar
                        </Button>
                      </article>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </div>
      <Dialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <DialogContent className="p-5">
          <DialogTitle className="pr-10 font-display text-2xl font-semibold tracking-tight">Eliminar entrenamiento</DialogTitle>
          <DialogDescription className="mt-2 text-sm text-muted">
            {pending ? `¿Eliminar «${pending.title}» de ${pending.teamName}? No se puede deshacer.` : ""}
          </DialogDescription>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPending(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!pending) return;
                const target = pending;
                setPending(null);
                void sessionApi.deleteSession(target);
              }}
            >
              Eliminar
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

function SessionThumb({ session }: { session: Session }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    let cancelled = false;
    const draw = () => {
      if (cancelled || !ref.current) return;
      const width = 132;
      const height = Math.round((width * PAGE_H) / PAGE_W);
      const dpr = 2;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.setTransform(canvas.width / PAGE_W, 0, 0, canvas.height / PAGE_H, 0, 0);
      paintSheet(ctx, session, null, true);
    };
    draw();
    void document.fonts?.ready.then(draw);
    return () => {
      cancelled = true;
    };
  }, [session]);
  return <canvas ref={ref} className="aspect-[1000/1414] w-full rounded-2xl bg-[#f6f1e7]" aria-hidden />;
}
