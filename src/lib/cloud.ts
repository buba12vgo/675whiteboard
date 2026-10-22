import { collection, deleteDoc, doc, getDoc, onSnapshot, setDoc, type Unsubscribe } from "firebase/firestore";
import { firebaseDb } from "@/lib/firebase";
import { sanitizeDraft, sanitizePlay } from "@/lib/schema";
import { sanitizeSession, sanitizeTeam, type Session, type Team } from "@/lib/session";
import type { Draft, Play } from "@/lib/types";

// Standard listeners (not pipelines): the board must keep working offline and
// refresh the signed-in coach's library as soon as another device writes.

export type CloudDraft = { doc: Draft; savedAt: number };

function playRef(uid: string, playId: string) {
  return doc(firebaseDb(), "users", uid, "plays", playId);
}

function draftRef(uid: string) {
  return doc(firebaseDb(), "users", uid, "drafts", "current");
}

function playPayload(play: Play) {
  return {
    id: play.id,
    name: play.name,
    category: play.category,
    notes: play.notes,
    view: play.view,
    court: play.court,
    frames: play.frames,
    createdAt: play.createdAt,
    updatedAt: play.updatedAt,
  };
}

export async function cloudPutPlay(uid: string, play: Play): Promise<void> {
  await setDoc(playRef(uid, play.id), playPayload(play));
}

export async function cloudDeletePlay(uid: string, playId: string): Promise<void> {
  await deleteDoc(playRef(uid, playId));
}

export async function cloudSaveDraft(uid: string, draft: Draft, savedAt: number): Promise<void> {
  await setDoc(draftRef(uid), {
    view: draft.view,
    court: draft.court,
    frames: draft.frames,
    frameIndex: draft.frameIndex,
    meta: draft.meta,
    savedAt,
  });
}

export async function cloudLoadDraft(uid: string): Promise<CloudDraft | null> {
  const snap = await getDoc(draftRef(uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  const docDraft = sanitizeDraft(data);
  if (!docDraft) return null;
  const savedAt = typeof data.savedAt === "number" ? data.savedAt : 0;
  return { doc: docDraft, savedAt };
}

export function subscribePlays(uid: string, onPlays: (plays: Play[], removeMissing: boolean) => void): Unsubscribe {
  return onSnapshot(collection(firebaseDb(), "users", uid, "plays"), (snap) => {
    const plays = snap.docs
      .map((item) => sanitizePlay({ id: item.id, ...item.data() }))
      .filter((play): play is Play => play !== null);
    onPlays(plays, !snap.metadata.hasPendingWrites);
  });
}

function teamRef(uid: string, teamId: string) {
  return doc(firebaseDb(), "users", uid, "teams", teamId);
}

function sessionRef(uid: string, sessionId: string) {
  return doc(firebaseDb(), "users", uid, "sessions", sessionId);
}

export async function cloudPutTeam(uid: string, team: Team): Promise<void> {
  await setDoc(teamRef(uid, team.id), {
    id: team.id,
    name: team.name,
    createdAt: team.createdAt,
    updatedAt: team.updatedAt,
  });
}

export async function cloudPutSession(uid: string, session: Session): Promise<void> {
  await setDoc(sessionRef(uid, session.id), {
    id: session.id,
    title: session.title,
    teamId: session.teamId,
    teamName: session.teamName,
    date: session.date,
    court: session.court,
    ink: session.ink,
    slots: session.slots,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
  });
}

export async function cloudDeleteSession(uid: string, sessionId: string): Promise<void> {
  await deleteDoc(sessionRef(uid, sessionId));
}

export function subscribeTeams(uid: string, onTeams: (teams: Team[], removeMissing: boolean) => void): Unsubscribe {
  return onSnapshot(
    collection(firebaseDb(), "users", uid, "teams"),
    (snap) => {
      const teams = snap.docs
        .map((item) => sanitizeTeam({ id: item.id, ...item.data() }))
        .filter((team): team is Team => team !== null);
      onTeams(teams, !snap.metadata.hasPendingWrites);
    },
    () => undefined,
  );
}

export function subscribeSessions(
  uid: string,
  onSessions: (sessions: Session[], removeMissing: boolean) => void,
): Unsubscribe {
  return onSnapshot(
    collection(firebaseDb(), "users", uid, "sessions"),
    (snap) => {
      const sessions = snap.docs
        .map((item) => sanitizeSession({ id: item.id, ...item.data() }))
        .filter((session): session is Session => session !== null);
      onSessions(sessions, !snap.metadata.hasPendingWrites);
    },
    () => undefined,
  );
}
