import { getApp, getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import { getFirestore, initializeFirestore, persistentLocalCache, type Firestore } from "firebase/firestore";

const databaseId = import.meta.env.VITE_FIREBASE_DATABASE_ID || "pizarra";

/** Keep Google sign-in on the page's own domain. Mobile browsers block the firebaseapp.com helper. */
export function authDomainForHost(host: string, configured: string): string {
  if (host === "localhost" || host === "127.0.0.1") return configured;
  return host;
}

function readConfig() {
  const apiKey = import.meta.env.VITE_FIREBASE_API_KEY;
  const configuredDomain = import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;
  const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID;
  const storageBucket = import.meta.env.VITE_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID;
  const appId = import.meta.env.VITE_FIREBASE_APP_ID;
  if (!apiKey || !configuredDomain || !projectId || !appId) return null;
  const authDomain =
    typeof window === "undefined" ? configuredDomain : authDomainForHost(window.location.hostname, configuredDomain);
  return { apiKey, authDomain, projectId, storageBucket, messagingSenderId, appId };
}

export function firebaseConfigured(): boolean {
  return readConfig() !== null;
}

function app(): FirebaseApp {
  const config = readConfig();
  if (!config) throw new Error("Falta la configuración de Firebase.");
  return getApps()[0] ?? initializeApp(config);
}

let auth: Auth | null = null;
let database: Firestore | null = null;

export function firebaseAuth(): Auth {
  if (!auth) auth = getAuth(app());
  return auth;
}

export function firebaseDb(): Firestore {
  if (database) return database;
  const firebaseApp = getApps()[0] ?? app();
  try {
    database = initializeFirestore(firebaseApp, { localCache: persistentLocalCache() }, databaseId);
  } catch {
    database = getFirestore(getApp(), databaseId);
  }
  return database;
}
