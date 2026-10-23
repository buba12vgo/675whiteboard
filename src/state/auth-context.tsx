import {
  createUserWithEmailAndPassword,
  getRedirectResult,
  GoogleAuthProvider,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  signOut,
  type User,
} from "firebase/auth";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { messageForAuth } from "@/lib/auth-errors";
import { firebaseAuth, firebaseConfigured } from "@/lib/firebase";
import { chooseGuest, clearGuest, guestChosen } from "@/lib/guest";

type AuthApi = {
  ready: boolean;
  user: User | null;
  guest: boolean;
  configured: boolean;
  error: string | null;
  busy: boolean;
  clearError: () => void;
  enterGuest: () => void;
  leaveGuest: () => void;
  signInGoogle: () => Promise<void>;
  signInEmail: (email: string, password: string) => Promise<void>;
  signUpEmail: (email: string, password: string) => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthApi | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const configured = firebaseConfigured();
  const [guest, setGuest] = useState(guestChosen);
  const [ready, setReady] = useState(!configured || guestChosen());
  const [user, setUser] = useState<User | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!configured) return;
    let unsub = () => {};
    try {
      const auth = firebaseAuth();
      unsub = onAuthStateChanged(auth, (next) => {
        setUser(next);
        if (next) {
          clearGuest();
          setGuest(false);
        }
        setReady(true);
      });
      getRedirectResult(auth).catch((cause) => setError(messageForAuth(cause)));
    } catch {
      setReady(true);
    }
    const timer = window.setTimeout(() => setReady(true), 800);
    return () => {
      unsub();
      window.clearTimeout(timer);
    };
  }, [configured]);

  const api = useMemo<AuthApi>(
    () => ({
      ready,
      user,
      guest,
      configured,
      error,
      busy,
      clearError: () => setError(null),
      enterGuest: () => {
        chooseGuest();
        setGuest(true);
        setReady(true);
        setError(null);
      },
      leaveGuest: () => {
        clearGuest();
        setGuest(false);
      },
      signInGoogle: async () => {
        setBusy(true);
        setError(null);
        try {
          const provider = new GoogleAuthProvider();
          provider.setCustomParameters({ prompt: "select_account" });
          const coarse = window.matchMedia("(pointer: coarse)").matches;
          if (coarse) await signInWithRedirect(firebaseAuth(), provider);
          else await signInWithPopup(firebaseAuth(), provider);
        } catch (cause) {
          setError(messageForAuth(cause));
        } finally {
          setBusy(false);
        }
      },
      signInEmail: async (email, password) => {
        setBusy(true);
        setError(null);
        try {
          await signInWithEmailAndPassword(firebaseAuth(), email.trim(), password);
        } catch (cause) {
          setError(messageForAuth(cause));
        } finally {
          setBusy(false);
        }
      },
      signUpEmail: async (email, password) => {
        setBusy(true);
        setError(null);
        try {
          await createUserWithEmailAndPassword(firebaseAuth(), email.trim(), password);
        } catch (cause) {
          setError(messageForAuth(cause));
        } finally {
          setBusy(false);
        }
      },
      signOutUser: async () => {
        clearGuest();
        setGuest(false);
        if (configured) await signOut(firebaseAuth());
      },
    }),
    [busy, configured, error, guest, ready, user],
  );

  return <AuthContext.Provider value={api}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthApi {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth fuera de AuthProvider");
  return value;
}
