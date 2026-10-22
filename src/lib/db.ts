import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { sanitizeDraft } from "@/lib/schema";
import type { Session, Team } from "@/lib/session";
import type { Draft, Play } from "@/lib/types";

interface PizarraDB extends DBSchema {
  plays: {
    key: string;
    value: Play;
    indexes: { "by-updated": number };
  };
  kv: {
    key: string;
    value: { version: number; doc: Draft; savedAt?: number };
  };
  teams: {
    key: string;
    value: Team;
  };
  sessions: {
    key: string;
    value: Session;
    indexes: { "by-date": string };
  };
}

const DB_NAME = "pizarra";
const DB_VERSION = 2;

let dbPromise: Promise<IDBPDatabase<PizarraDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<PizarraDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        if (!database.objectStoreNames.contains("plays")) {
          const plays = database.createObjectStore("plays", { keyPath: "id" });
          plays.createIndex("by-updated", "updatedAt");
        }
        if (!database.objectStoreNames.contains("kv")) database.createObjectStore("kv");
        if (!database.objectStoreNames.contains("teams")) database.createObjectStore("teams", { keyPath: "id" });
        if (!database.objectStoreNames.contains("sessions")) {
          const sessions = database.createObjectStore("sessions", { keyPath: "id" });
          sessions.createIndex("by-date", "date");
        }
      },
    });
  }
  return dbPromise;
}

export async function loadDraftRecord(): Promise<{ doc: Draft; savedAt: number } | null> {
  const stored = await (await db()).get("kv", "draft");
  const doc = sanitizeDraft(stored);
  if (!doc) return null;
  const savedAt = stored && typeof stored.savedAt === "number" ? stored.savedAt : 0;
  return { doc, savedAt };
}

export async function loadDraft(): Promise<Draft | null> {
  return (await loadDraftRecord())?.doc ?? null;
}

export async function saveDraft(draft: Draft, savedAt = Date.now()): Promise<number> {
  await (await db()).put("kv", { version: 1, doc: draft, savedAt }, "draft");
  return savedAt;
}

export async function syncPlays(plays: Play[], removeMissing: boolean, keep: ReadonlySet<string> = new Set()): Promise<void> {
  const database = await db();
  const tx = database.transaction("plays", "readwrite");
  if (removeMissing) {
    const keys = await tx.store.getAllKeys();
    const incoming = new Set(plays.map((play) => play.id));
    for (const key of keys) {
      const id = String(key);
      if (!incoming.has(id) && !keep.has(id)) await tx.store.delete(key);
    }
  }
  for (const play of plays) await tx.store.put(play);
  await tx.done;
}

export async function listPlays(): Promise<Play[]> {
  const plays = await (await db()).getAll("plays");
  return plays.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function getPlay(id: string): Promise<Play | undefined> {
  return (await db()).get("plays", id);
}

export async function putPlay(play: Play): Promise<void> {
  await (await db()).put("plays", play);
}

export async function removePlay(id: string): Promise<void> {
  await (await db()).delete("plays", id);
}

export async function listTeams(): Promise<Team[]> {
  const teams = await (await db()).getAll("teams");
  return teams.sort((a, b) => a.name.localeCompare(b.name, "es"));
}

export async function putTeam(team: Team): Promise<void> {
  await (await db()).put("teams", team);
}

export async function syncTeams(teams: Team[], removeMissing: boolean, keep: ReadonlySet<string> = new Set()): Promise<void> {
  const database = await db();
  const tx = database.transaction("teams", "readwrite");
  if (removeMissing) {
    const keys = await tx.store.getAllKeys();
    const incoming = new Set(teams.map((team) => team.id));
    for (const key of keys) {
      const id = String(key);
      if (!incoming.has(id) && !keep.has(id)) await tx.store.delete(key);
    }
  }
  for (const team of teams) await tx.store.put(team);
  await tx.done;
}

export async function listSessions(): Promise<Session[]> {
  const sessions = await (await db()).getAll("sessions");
  return sessions.sort((a, b) => b.date.localeCompare(a.date) || b.updatedAt - a.updatedAt);
}

export async function putSession(session: Session): Promise<void> {
  await (await db()).put("sessions", session);
}

export async function removeSession(id: string): Promise<void> {
  await (await db()).delete("sessions", id);
}

export async function syncSessions(
  sessions: Session[],
  removeMissing: boolean,
  keep: ReadonlySet<string> = new Set(),
): Promise<void> {
  const database = await db();
  const tx = database.transaction("sessions", "readwrite");
  if (removeMissing) {
    const keys = await tx.store.getAllKeys();
    const incoming = new Set(sessions.map((session) => session.id));
    for (const key of keys) {
      const id = String(key);
      if (!incoming.has(id) && !keep.has(id)) await tx.store.delete(key);
    }
  }
  for (const session of sessions) await tx.store.put(session);
  await tx.done;
}
