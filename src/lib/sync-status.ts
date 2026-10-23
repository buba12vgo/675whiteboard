import { useSyncExternalStore } from "react";

export type SyncSnapshot = {
  online: boolean;
  linked: boolean;
  pending: boolean;
};

let online = typeof navigator === "undefined" ? true : navigator.onLine;
let linked = false;
let writes = 0;
const remotePending = new Set<string>();
const listeners = new Set<() => void>();
let listening = false;
let current: SyncSnapshot = { online, linked, pending: false };

function publish() {
  const pending = writes > 0 || remotePending.size > 0;
  if (current.online === online && current.linked === linked && current.pending === pending) return;
  current = { online, linked, pending };
  for (const listener of listeners) listener();
}

function ensureNet() {
  if (listening || typeof window === "undefined") return;
  listening = true;
  window.addEventListener("online", () => {
    online = true;
    publish();
  });
  window.addEventListener("offline", () => {
    online = false;
    publish();
  });
}

function read(): SyncSnapshot {
  return current;
}

export function setLinkedAccount(next: boolean) {
  if (linked === next) return;
  linked = next;
  if (!next) remotePending.clear();
  publish();
}

export function noteRemotePending(source: string, pending: boolean) {
  if (pending) remotePending.add(source);
  else remotePending.delete(source);
  publish();
}

/** Count a Firestore write until it settles. Offline, the label prefers "Sin conexión". */
export function trackWrite(promise: Promise<unknown>) {
  writes += 1;
  publish();
  promise.finally(() => {
    writes = Math.max(0, writes - 1);
    publish();
  });
}

export function syncLabel(state: SyncSnapshot): string {
  if (!state.online) return "Sin conexión";
  if (!state.linked) return "En este iPad";
  if (state.pending) return "Sincronizando";
  return "En la cuenta";
}

function subscribe(listener: () => void) {
  ensureNet();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const serverSnapshot: SyncSnapshot = { online: true, linked: false, pending: false };

export function useSyncStatus(): SyncSnapshot {
  return useSyncExternalStore(subscribe, read, () => serverSnapshot);
}
