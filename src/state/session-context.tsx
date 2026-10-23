import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  cloudDeleteSession,
  cloudPutSession,
  cloudPutTeam,
  subscribeSessions,
  subscribeTeams,
} from "@/lib/cloud";
import { listSessions, listTeams, putSession, putTeam, removeSession, syncSessions, syncTeams } from "@/lib/db";
import {
  emptySlots,
  findTeamByName,
  sanitizeSession,
  todayISO,
  type PageInk,
  type Session,
  type SheetSlot,
  type SlotMarks,
  type Team,
} from "@/lib/session";
import { noteRemotePending, trackWrite } from "@/lib/sync-status";
import type { CourtKind } from "@/lib/types";
import { uid } from "@/lib/utils";

type Snap = { ink: PageInk[]; slots: Record<SheetSlot, SlotMarks> };

type SessionApi = {
  teams: Team[];
  sessions: Session[];
  active: Session | null;
  dirty: boolean;
  canUndo: boolean;
  canRedo: boolean;
  chooserOpen: boolean;
  teamDialogOpen: boolean;
  toast: string | null;
  setChooserOpen: (open: boolean) => void;
  setTeamDialogOpen: (open: boolean) => void;
  startSession: (input: { teamId: string | null; teamName: string; date: string; court: CourtKind }) => Promise<void>;
  openSession: (session: Session) => void;
  closeActive: () => Promise<void>;
  patchActive: (partial: Partial<Pick<Session, "title" | "court" | "date">>) => void;
  commitActive: (recipe: (session: Session) => Session) => void;
  undo: () => void;
  redo: () => void;
  saveActive: (announce?: boolean) => Promise<void>;
  deleteSession: (session: Session) => Promise<void>;
};

const SessionContext = createContext<SessionApi | null>(null);

function snapshot(session: Session): Snap {
  return structuredClone({ ink: session.ink, slots: session.slots });
}

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id);
  if (index < 0) return [next, ...items];
  const copy = items.slice();
  copy[index] = next;
  return copy;
}

export function SessionProvider({ userId, linked, children }: { userId: string; linked: boolean; children: ReactNode }) {
  const [teams, setTeams] = useState<Team[]>([]);
  const [sessions, setSessions] = useState<Session[]>([]);
  const [active, setActive] = useState<Session | null>(null);
  const [dirty, setDirty] = useState(false);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [chooserOpen, setChooserOpen] = useState(false);
  const [teamDialogOpen, setTeamDialogOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const activeRef = useRef<Session | null>(null);
  const dirtyRef = useRef(false);
  const past = useRef<Snap[]>([]);
  const future = useRef<Snap[]>([]);
  const generation = useRef(0);
  const pendingTeams = useRef(new Set<string>());
  const pendingSessions = useRef(new Set<string>());
  const teamsRef = useRef<Team[]>([]);
  const toastTimer = useRef(0);
  const cloudWarned = useRef(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const remember = useCallback((session: Session | null, isDirty: boolean) => {
    activeRef.current = session;
    dirtyRef.current = isDirty;
    setActive(session);
    setDirty(isDirty);
  }, []);

  const refreshHistory = useCallback(() => {
    setCanUndo(past.current.length > 0);
    setCanRedo(future.current.length > 0);
  }, []);

  const clearHistory = useCallback(() => {
    past.current = [];
    future.current = [];
    refreshHistory();
  }, [refreshHistory]);

  useEffect(() => {
    teamsRef.current = teams;
  }, [teams]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listTeams(), listSessions()])
      .then(([storedTeams, storedSessions]) => {
        if (cancelled) return;
        setTeams(storedTeams);
        setSessions(storedSessions);
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!linked) return;
    let unsubscribe = () => {};
    let cancelled = false;
    listTeams()
      .then((local) => {
        if (cancelled) return;
        for (const team of local) pendingTeams.current.add(team.id);
        let merged = false;
        const stop = subscribeTeams(userId, (incoming, removeMissing) => {
          noteRemotePending("teams", !removeMissing);
          if (!merged) {
            merged = true;
            const byId = new Map(incoming.map((team) => [team.id, team]));
            for (const team of local) {
              const remote = byId.get(team.id);
              if (!remote || team.updatedAt > remote.updatedAt) {
                trackWrite(cloudPutTeam(userId, team).catch(() => undefined));
              } else pendingTeams.current.delete(team.id);
            }
          }
          for (const id of pendingTeams.current) {
            if (incoming.some((team) => team.id === id)) pendingTeams.current.delete(id);
          }
          syncTeams(incoming, removeMissing, pendingTeams.current)
            .then(() => listTeams())
            .then((stored) => setTeams(stored))
            .catch(() => undefined);
        });
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      noteRemotePending("teams", false);
      unsubscribe();
    };
  }, [linked, userId]);

  useEffect(() => {
    if (!linked) return;
    let unsubscribe = () => {};
    let cancelled = false;
    listSessions()
      .then((local) => {
        if (cancelled) return;
        for (const session of local) pendingSessions.current.add(session.id);
        let merged = false;
        const stop = subscribeSessions(userId, (incoming, removeMissing) => {
          noteRemotePending("sessions", !removeMissing);
          if (!merged) {
            merged = true;
            const byId = new Map(incoming.map((session) => [session.id, session]));
            for (const session of local) {
              const remote = byId.get(session.id);
              if (!remote || session.updatedAt > remote.updatedAt) {
                trackWrite(cloudPutSession(userId, session).catch(() => undefined));
              } else pendingSessions.current.delete(session.id);
            }
          }
          for (const id of pendingSessions.current) {
            if (incoming.some((session) => session.id === id)) pendingSessions.current.delete(id);
          }
          syncSessions(incoming, removeMissing, pendingSessions.current)
            .then(() => listSessions())
            .then((stored) => {
              setSessions(stored);
              const open = activeRef.current;
              if (!open || dirtyRef.current) return;
              const fresh = stored.find((session) => session.id === open.id);
              if (fresh && fresh.updatedAt > open.updatedAt) remember(fresh, false);
            })
            .catch(() => undefined);
        });
        if (cancelled) stop();
        else unsubscribe = stop;
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      noteRemotePending("sessions", false);
      unsubscribe();
    };
  }, [linked, remember, userId]);

  const saveActive = useCallback(async (announce = false) => {
    const current = activeRef.current;
    if (!current) return;
    const seen = generation.current;
    const stamped = sanitizeSession({ ...current, updatedAt: Date.now() });
    if (!stamped) return;
    pendingSessions.current.add(stamped.id);
    try {
      await putSession(stamped);
    } catch {
      notify("No se pudo guardar la sesión en este navegador.");
      return;
    }
    setSessions((items) => upsert(items, stamped));
    if (announce && generation.current === seen) notify("Sesión guardada");
    if (activeRef.current?.id === stamped.id && generation.current === seen) {
      activeRef.current = stamped;
      setActive(stamped);
      dirtyRef.current = false;
      setDirty(false);
    }
    if (!linked) return;
    trackWrite(
      cloudPutSession(userId, stamped).catch(() => {
        if (!navigator.onLine || cloudWarned.current) return;
        cloudWarned.current = true;
        notify("La sesión se quedó en este iPad. Se sincronizará cuando haya red.");
      }),
    );
  }, [linked, notify, userId]);

  useEffect(() => {
    if (!active || !dirty) return;
    const timer = window.setTimeout(() => {
      void saveActive();
    }, 700);
    return () => window.clearTimeout(timer);
  }, [active, dirty, saveActive]);

  const storeTeam = useCallback(
    async (team: Team) => {
      pendingTeams.current.add(team.id);
      await putTeam(team);
      setTeams((items) => upsert(items, team).sort((a, b) => a.name.localeCompare(b.name, "es")));
      if (!linked) return;
      trackWrite(
        cloudPutTeam(userId, team).catch(() => {
          if (!navigator.onLine || cloudWarned.current) return;
          cloudWarned.current = true;
          notify("El equipo se quedó en este iPad. Se sincronizará cuando haya red.");
        }),
      );
    },
    [linked, notify, userId],
  );

  const startSession = useCallback(
    async (input: { teamId: string | null; teamName: string; date: string; court: CourtKind }) => {
      const name = input.teamName.trim().slice(0, 80);
      if (!name) return;
      if (dirtyRef.current) await saveActive();
      const picked = input.teamId ? teamsRef.current.find((team) => team.id === input.teamId) : undefined;
      let team = picked ?? findTeamByName(teamsRef.current, name);
      if (!team) {
        const now = Date.now();
        team = { id: uid(), name, createdAt: now, updatedAt: now };
        await storeTeam(team);
      }
      const now = Date.now();
      const session: Session = {
        id: uid(),
        title: "Sesión",
        teamId: team.id,
        teamName: team.name,
        date: /^\d{4}-\d{2}-\d{2}$/.test(input.date) ? input.date : todayISO(),
        court: input.court,
        ink: [],
        slots: emptySlots(),
        createdAt: now,
        updatedAt: now,
      };
      pendingSessions.current.add(session.id);
      await putSession(session);
      setSessions((items) => upsert(items, session));
      clearHistory();
      generation.current += 1;
      remember(session, true);
      setChooserOpen(false);
      setTeamDialogOpen(false);
      if (linked) trackWrite(cloudPutSession(userId, session).catch(() => undefined));
    },
    [clearHistory, linked, remember, saveActive, storeTeam, userId],
  );

  const openSession = useCallback(
    (session: Session) => {
      const clean = sanitizeSession(session);
      if (!clean) return;
      if (dirtyRef.current) void saveActive();
      clearHistory();
      generation.current += 1;
      remember(clean, false);
      setChooserOpen(false);
      setTeamDialogOpen(false);
    },
    [clearHistory, remember, saveActive],
  );

  const closeActive = useCallback(async () => {
    if (dirtyRef.current) await saveActive();
    clearHistory();
    remember(null, false);
  }, [clearHistory, remember, saveActive]);

  const patchActive = useCallback(
    (partial: Partial<Pick<Session, "title" | "court" | "date">>) => {
      const current = activeRef.current;
      if (!current) return;
      const next = { ...current, ...partial, updatedAt: Date.now() };
      generation.current += 1;
      remember(next, true);
    },
    [remember],
  );

  const commitActive = useCallback(
    (recipe: (session: Session) => Session) => {
      const current = activeRef.current;
      if (!current) return;
      past.current.push(snapshot(current));
      if (past.current.length > 50) past.current.shift();
      future.current = [];
      const next = recipe(current);
      generation.current += 1;
      remember({ ...next, updatedAt: Date.now() }, true);
      refreshHistory();
    },
    [refreshHistory, remember],
  );

  const undo = useCallback(() => {
    const current = activeRef.current;
    const previous = past.current.pop();
    if (!current || !previous) return;
    future.current.push(snapshot(current));
    generation.current += 1;
    remember({ ...current, ink: previous.ink, slots: previous.slots, updatedAt: Date.now() }, true);
    refreshHistory();
  }, [refreshHistory, remember]);

  const redo = useCallback(() => {
    const current = activeRef.current;
    const next = future.current.pop();
    if (!current || !next) return;
    past.current.push(snapshot(current));
    generation.current += 1;
    remember({ ...current, ink: next.ink, slots: next.slots, updatedAt: Date.now() }, true);
    refreshHistory();
  }, [refreshHistory, remember]);

  const deleteSession = useCallback(
    async (session: Session) => {
      pendingSessions.current.delete(session.id);
      await removeSession(session.id);
      setSessions((items) => items.filter((item) => item.id !== session.id));
      if (activeRef.current?.id === session.id) {
        clearHistory();
        remember(null, false);
      }
      if (linked) {
        trackWrite(
          cloudDeleteSession(userId, session.id).catch(() => {
            if (navigator.onLine) notify("Se borró en este iPad, pero la copia en la nube sigue ahí.");
          }),
        );
      }
    },
    [clearHistory, linked, notify, remember, userId],
  );

  const api = useMemo<SessionApi>(
    () => ({
      teams,
      sessions,
      active,
      dirty,
      canUndo,
      canRedo,
      chooserOpen,
      teamDialogOpen,
      toast,
      setChooserOpen,
      setTeamDialogOpen,
      startSession,
      openSession,
      closeActive,
      patchActive,
      commitActive,
      undo,
      redo,
      saveActive,
      deleteSession,
    }),
    [
      active,
      canRedo,
      canUndo,
      chooserOpen,
      closeActive,
      commitActive,
      deleteSession,
      dirty,
      openSession,
      patchActive,
      redo,
      saveActive,
      sessions,
      startSession,
      teamDialogOpen,
      teams,
      toast,
      undo,
    ],
  );

  return <SessionContext.Provider value={api}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionApi {
  const value = useContext(SessionContext);
  if (!value) throw new Error("useSession fuera del proveedor");
  return value;
}
