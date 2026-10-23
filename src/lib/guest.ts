const GUEST_KEY = "pizarra-guest";

/** IndexedDB owner while the coach has not signed in. */
export const LOCAL_USER = "local";

type StorageLike = { getItem(key: string): string | null; setItem(key: string, value: string): void; removeItem(key: string): void };

function storage(): StorageLike | null {
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function guestChosen(source: StorageLike | null = storage()): boolean {
  return source?.getItem(GUEST_KEY) === "1";
}

export function chooseGuest(target: StorageLike | null = storage()): void {
  target?.setItem(GUEST_KEY, "1");
}

export function clearGuest(target: StorageLike | null = storage()): void {
  target?.removeItem(GUEST_KEY);
}
