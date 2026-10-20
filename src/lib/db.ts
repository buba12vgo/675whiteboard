import { openDB, type DBSchema, type IDBPDatabase } from "idb";
import { sanitizeDraft } from "@/lib/schema";
import type { Draft, Play } from "@/lib/types";

interface PizarraDB extends DBSchema {
  plays: {
    key: string;
    value: Play;
    indexes: { "by-updated": number };
  };
  kv: {
    key: string;
    value: { version: number; doc: Draft };
  };
}

const DB_NAME = "pizarra";
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase<PizarraDB>> | null = null;

function db() {
  if (!dbPromise) {
    dbPromise = openDB<PizarraDB>(DB_NAME, DB_VERSION, {
      upgrade(database) {
        const plays = database.createObjectStore("plays", { keyPath: "id" });
        plays.createIndex("by-updated", "updatedAt");
        database.createObjectStore("kv");
      },
    });
  }
  return dbPromise;
}

export async function loadDraft(): Promise<Draft | null> {
  const stored = await (await db()).get("kv", "draft");
  return sanitizeDraft(stored);
}

export async function saveDraft(draft: Draft): Promise<void> {
  await (await db()).put("kv", { version: 1, doc: draft }, "draft");
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
