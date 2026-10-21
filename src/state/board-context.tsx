import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { cloudDeletePlay, cloudLoadDraft, cloudPutPlay, cloudSaveDraft, subscribePlays } from "@/lib/cloud";
import { getPlay, listPlays, loadDraftRecord, putPlay, removePlay, saveDraft, syncPlays } from "@/lib/db";
import { FLAT_COLORS, isCourtFloor, type CourtFloor } from "@/lib/court";
import { downloadJson, shareOrDownload } from "@/lib/image";
import { pngFilename } from "@/lib/image";
import { draftFromPlay, parsePlays, playFromDraft, serializePlays } from "@/lib/schema";
import { tokenFromRoster } from "@/lib/tokens";
import type { Category, LineCap, LineStyle, Play, Stroke, Tool } from "@/lib/types";
import { easeInOut, uid } from "@/lib/utils";
import {
  canRedo,
  canUndo,
  createInitialDoc,
  createState,
  docSignature,
  reducer,
  signatureOfPlay,
  type State,
} from "@/state/reducer";

const SETTINGS_KEY = "pizarra-settings";

type Settings = {
  tool: Tool;
  color: string;
  lineStyle: LineStyle;
  cap: LineCap;
  width: number;
  toolbarOpen: boolean;
  showThree: boolean;
  floor: CourtFloor;
  flatColor: string;
};

type FormState = { mode: "save" } | { mode: "rename"; play: Play };

export type PlaySnap = {
  playing: boolean;
  t: number;
  index: number;
};

export type PlayStore = {
  get: () => PlaySnap;
  subscribe: (listener: () => void) => () => void;
  set: (next: PlaySnap) => void;
};

type Exporter = () => Promise<Blob>;

type BoardApi = {
  ready: boolean;
  persistError: boolean;
  state: State;
  tool: Tool;
  color: string;
  lineStyle: LineStyle;
  cap: LineCap;
  width: number;
  toolbarOpen: boolean;
  showThree: boolean;
  floor: CourtFloor;
  flatColor: string;
  playsOpen: boolean;
  playsVersion: number;
  form: FormState | null;
  confirmDelete: Play | null;
  toast: string | null;
  canUndo: boolean;
  canRedo: boolean;
  dirty: boolean;
  playStore: PlayStore;
  setTool: (tool: Tool) => void;
  setColor: (color: string) => void;
  setLineStyle: (style: LineStyle) => void;
  setCap: (cap: LineCap) => void;
  setWidth: (width: number) => void;
  setToolbarOpen: (open: boolean) => void;
  setShowThree: (show: boolean) => void;
  setFloor: (floor: CourtFloor) => void;
  setFlatColor: (color: string) => void;
  setPlaysOpen: (open: boolean) => void;
  openSave: () => void;
  openRename: (play: Play) => void;
  closeForm: () => void;
  askDelete: (play: Play) => void;
  cancelDelete: () => void;
  undo: () => void;
  redo: () => void;
  clearStrokes: () => void;
  toggleView: () => void;
  commitStroke: (stroke: Stroke) => void;
  eraseStrokes: (ids: string[]) => void;
  moveToken: (id: string, x: number, y: number, snapshot: boolean) => void;
  rotateToken: (id: string, rotation: number, snapshot: boolean) => void;
  removeToken: (id: string) => void;
  toggleRosterToken: (id: string) => void;
  resetTokens: () => void;
  setFrame: (index: number) => void;
  addFrame: () => void;
  deleteFrame: () => void;
  togglePlayback: () => void;
  stopPlayback: () => void;
  saveForm: (input: { name: string; category: Category; notes: string; asNew: boolean }) => Promise<void>;
  duplicatePlay: (play: Play) => Promise<void>;
  confirmDeletePlay: () => Promise<void>;
  openPlay: (play: Play) => void;
  askNewPlay: () => void;
  confirmNew: boolean;
  cancelNewPlay: () => void;
  commitNewPlay: () => void;
  exportJson: () => Promise<void>;
  importJson: (text: string) => Promise<void>;
  exportPng: () => Promise<void>;
  registerExporter: (exporter: Exporter | null) => void;
};

const BoardContext = createContext<BoardApi | null>(null);
const PlayStoreContext = createContext<PlayStore | null>(null);

function loadSettings(): Settings {
  const fallback: Settings = {
    tool: "draw",
    color: "#1a2332",
    lineStyle: "solid",
    cap: "arrow",
    width: 0.1,
    toolbarOpen: true,
    showThree: true,
    floor: "parquet-light",
    flatColor: FLAT_COLORS[0].value,
  };
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const floor = isCourtFloor(parsed.floor) ? parsed.floor : null;
    if (!floor) return { ...fallback, ...parsed, floor: fallback.floor, showThree: true, flatColor: fallback.flatColor };
    return {
      ...fallback,
      ...parsed,
      floor,
      flatColor: typeof parsed.flatColor === "string" ? parsed.flatColor : fallback.flatColor,
      showThree: typeof parsed.showThree === "boolean" ? parsed.showThree : true,
    };
  } catch {
    return fallback;
  }
}

function createPlayStore(): PlayStore {
  let snap: PlaySnap = { playing: false, t: 0, index: 0 };
  const listeners = new Set<() => void>();
  return {
    get: () => snap,
    subscribe: (listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    set: (next) => {
      if (next.playing === snap.playing && next.t === snap.t && next.index === snap.index) return;
      snap = next;
      listeners.forEach((listener) => listener());
    },
  };
}

const MAX_FRAMES = 40;

export function BoardProvider({ userId, children }: { userId: string; children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, createState);
  const [settings] = useState(loadSettings);
  const [tool, setToolState] = useState<Tool>(settings.tool);
  const [color, setColorState] = useState(settings.color);
  const [lineStyle, setLineStyleState] = useState<LineStyle>(settings.lineStyle);
  const [cap, setCapState] = useState<LineCap>(settings.cap);
  const [width, setWidthState] = useState(settings.width);
  const [toolbarOpen, setToolbarOpenState] = useState(settings.toolbarOpen);
  const [showThree, setShowThreeState] = useState(settings.showThree);
  const [floor, setFloorState] = useState<CourtFloor>(settings.floor);
  const [flatColor, setFlatColorState] = useState(settings.flatColor);
  const [ready, setReady] = useReducer((_: boolean, next: boolean) => next, false);
  const [persistError, setPersistError] = useReducer((_: boolean, next: boolean) => next, false);
  const [playsOpen, setPlaysOpen] = useReducer((_: boolean, next: boolean) => next, false);
  const [playsVersion, bumpPlays] = useReducer((value: number) => value + 1, 0);
  const [form, setForm] = useReducer((_: FormState | null, next: FormState | null) => next, null);
  const [confirmDelete, setConfirmDelete] = useReducer((_: Play | null, next: Play | null) => next, null);
  const [confirmNew, setConfirmNew] = useReducer((_: boolean, next: boolean) => next, false);
  const [toast, setToast] = useReducer((_: string | null, next: string | null) => next, null);
  const [savedSig, setSavedSig] = useReducer((_: string, next: string) => next, "");
  const [playStore] = useState(createPlayStore);
  const exporterRef = useRef<Exporter | null>(null);
  const stateRef = useRef(state);
  useLayoutEffect(() => {
    stateRef.current = state;
  });
  const rafRef = useRef(0);
  const toastTimer = useRef(0);
  const canPersist = useRef(true);
  const cloudWarned = useRef(false);
  const pendingCloud = useRef(new Set<string>());

  const persistPlay = useCallback(async (play: Play) => {
    pendingCloud.current.add(play.id);
    await putPlay(play);
    await cloudPutPlay(userId, play);
  }, [userId]);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.clearTimeout(toastTimer.current);
    toastTimer.current = window.setTimeout(() => setToast(null), 2800);
  }, []);

  const stopPlayback = useCallback(() => {
    window.cancelAnimationFrame(rafRef.current);
    const snap = playStore.get();
    if (!snap.playing) return;
    playStore.set({ playing: false, t: 0, index: snap.index });
    dispatch({ type: "set-frame", index: snap.index });
  }, [playStore]);

  const edit = useCallback(
    (action: Parameters<typeof dispatch>[0]) => {
      stopPlayback();
      dispatch(action);
    },
    [stopPlayback],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const local = await loadDraftRecord();
        let draft = local?.doc ?? null;
        try {
          const remote = await cloudLoadDraft(userId);
          if (remote && remote.savedAt >= (local?.savedAt ?? 0)) draft = remote.doc;
        } catch {
          /* offline: the local draft is enough */
        }
        if (cancelled) return;
        const doc = draft ?? createInitialDoc();
        dispatch({ type: "replace", doc });
        playStore.set({ playing: false, t: 0, index: doc.frameIndex });
        if (doc.meta) {
          const play = await getPlay(doc.meta.id);
          if (!cancelled) setSavedSig(play ? signatureOfPlay(play) : docSignature(doc));
        } else if (!cancelled) {
          setSavedSig(docSignature(doc));
        }
        setReady(true);
      } catch {
        if (cancelled) return;
        canPersist.current = false;
        setPersistError(true);
        const doc = createInitialDoc();
        dispatch({ type: "replace", doc });
        setSavedSig(docSignature(doc));
        setReady(true);
        notify("No se pudo abrir el almacenamiento de este navegador. Los cambios se quedarán en memoria.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [notify, playStore, userId]);

  useEffect(() => {
    return subscribePlays(userId, (plays, removeMissing) => {
      const incoming = new Set(plays.map((play) => play.id));
      for (const id of pendingCloud.current) {
        if (incoming.has(id)) pendingCloud.current.delete(id);
      }
      syncPlays(plays, removeMissing, pendingCloud.current)
        .then(() => bumpPlays())
        .catch(() => undefined);
    });
  }, [userId]);

  useEffect(() => {
    if (!ready || !canPersist.current) return;
    const localTimer = window.setTimeout(() => {
      saveDraft(state.doc).catch(() => {
        canPersist.current = false;
        setPersistError(true);
      });
    }, 280);
    const cloudTimer = window.setTimeout(() => {
      const savedAt = Date.now();
      saveDraft(state.doc, savedAt).catch(() => undefined);
      cloudSaveDraft(userId, state.doc, savedAt).catch(() => {
        if (cloudWarned.current) return;
        cloudWarned.current = true;
        notify("El borrador no se pudo sincronizar. Se queda en este dispositivo.");
      });
    }, 1000);
    return () => {
      window.clearTimeout(localTimer);
      window.clearTimeout(cloudTimer);
    };
  }, [notify, ready, state.doc, userId]);

  useEffect(() => {
    const next: Settings = { tool, color, lineStyle, cap, width, toolbarOpen, showThree, floor, flatColor };
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota */
    }
  }, [tool, color, lineStyle, cap, width, toolbarOpen, showThree, floor, flatColor]);

  useEffect(() => () => window.cancelAnimationFrame(rafRef.current), []);

  const togglePlayback = useCallback(() => {
    const snap = playStore.get();
    if (snap.playing) {
      stopPlayback();
      return;
    }
    const doc = stateRef.current.doc;
    if (doc.frames.length < 2) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const moveDur = reduced ? 1 : 880;
    const holdDur = reduced ? 520 : 420;
    playStore.set({ playing: true, t: 0, index: doc.frameIndex });
    let start = performance.now();
    let phase: "move" | "hold" = "move";
    const loop = (now: number) => {
      if (!playStore.get().playing) return;
      const elapsed = now - start;
      if (phase === "move") {
        const t = Math.min(1, elapsed / moveDur);
        playStore.set({ playing: true, t: easeInOut(t), index: playStore.get().index });
        if (t >= 1) {
          phase = "hold";
          start = now;
        }
      } else if (elapsed >= holdDur) {
        const len = stateRef.current.doc.frames.length;
        if (len < 2) {
          stopPlayback();
          return;
        }
        const next = (playStore.get().index + 1) % len;
        playStore.set({ playing: true, t: 0, index: next });
        dispatch({ type: "set-frame", index: next });
        phase = "move";
        start = now;
      }
      rafRef.current = window.requestAnimationFrame(loop);
    };
    rafRef.current = window.requestAnimationFrame(loop);
  }, [playStore, stopPlayback]);

  const saveForm = useCallback(
    async (input: { name: string; category: Category; notes: string; asNew: boolean }) => {
      const name = input.name.trim().slice(0, 80);
      if (!name) {
        notify("Ponle un nombre a la jugada.");
        return;
      }
      const doc = stateRef.current.doc;
      const asNew = input.asNew || !doc.meta;
      const renaming = form?.mode === "rename" ? form.play : null;
      try {
        if (renaming && !input.asNew) {
          const updated: Play = {
            ...renaming,
            name,
            category: input.category,
            notes: input.notes.slice(0, 2000),
            updatedAt: Date.now(),
          };
          await persistPlay(updated);
          if (doc.meta?.id === renaming.id) {
            dispatch({
              type: "set-meta",
              meta: { id: updated.id, name: updated.name, category: updated.category, notes: updated.notes },
            });
          }
          bumpPlays();
          setForm(null);
          notify("Cambios guardados.");
          return;
        }
        let createdAt = Date.now();
        let id = uid();
        if (!asNew && doc.meta) {
          id = doc.meta.id;
          const existing = await getPlay(id);
          createdAt = existing?.createdAt ?? createdAt;
        }
        const meta = { id, name, category: input.category, notes: input.notes.slice(0, 2000) };
        const play = playFromDraft(doc, meta, { createdAt });
        await persistPlay(play);
        dispatch({ type: "set-meta", meta });
        setSavedSig(docSignature({ ...doc, meta }));
        bumpPlays();
        setForm(null);
        notify(asNew ? "Jugada guardada." : "Jugada actualizada.");
      } catch {
        notify("No se pudo guardar. Revisa la conexión o el tamaño de la jugada.");
      }
    },
    [form, notify, persistPlay],
  );

  const duplicatePlay = useCallback(
    async (play: Play) => {
      try {
        const copy: Play = {
          ...play,
          id: uid(),
          name: `${play.name} (copia)`.slice(0, 80),
          createdAt: Date.now(),
          updatedAt: Date.now(),
          frames: play.frames.map((frame) => ({
            ...frame,
            id: uid(),
            strokes: frame.strokes.map((stroke) => ({ ...stroke, id: uid() })),
            tokens: frame.tokens.map((token) => ({ ...token })),
          })),
        };
        await persistPlay(copy);
        bumpPlays();
        notify("Copia creada.");
      } catch {
        notify("No se pudo duplicar.");
      }
    },
    [notify, persistPlay],
  );

  const confirmDeletePlay = useCallback(async () => {
    const play = confirmDelete;
    if (!play) return;
    try {
      pendingCloud.current.delete(play.id);
      await removePlay(play.id);
      await cloudDeletePlay(userId, play.id);
      if (stateRef.current.doc.meta?.id === play.id) {
        dispatch({ type: "set-meta", meta: null });
        setSavedSig(docSignature({ ...stateRef.current.doc, meta: null }));
      }
      bumpPlays();
      setConfirmDelete(null);
      notify("Jugada eliminada.");
    } catch {
      notify("No se pudo eliminar.");
    }
  }, [confirmDelete, notify, userId]);

  const commitNewPlay = useCallback(() => {
    stopPlayback();
    const doc = { ...createInitialDoc(), view: stateRef.current.doc.view };
    dispatch({ type: "replace", doc });
    playStore.set({ playing: false, t: 0, index: 0 });
    setSavedSig(docSignature(doc));
    setConfirmNew(false);
    setPlaysOpen(false);
    notify("Campo listo para una jugada nueva.");
  }, [notify, playStore, stopPlayback]);

  const askNewPlay = useCallback(() => {
    const doc = stateRef.current.doc;
    const unsaved = savedSig !== "" && docSignature(doc) !== savedSig;
    if (unsaved) {
      setConfirmNew(true);
      return;
    }
    commitNewPlay();
  }, [commitNewPlay, savedSig]);

  const openPlay = useCallback(
    (play: Play) => {
      stopPlayback();
      const doc = draftFromPlay(play);
      dispatch({ type: "replace", doc });
      playStore.set({ playing: false, t: 0, index: 0 });
      setSavedSig(signatureOfPlay(play));
      setPlaysOpen(false);
    },
    [playStore, stopPlayback],
  );

  const exportJson = useCallback(async () => {
    try {
      const plays = await listPlays();
      if (plays.length === 0) {
        notify("No hay jugadas para exportar.");
        return;
      }
      downloadJson(`pizarra-jugadas-${new Date().toISOString().slice(0, 10)}.json`, serializePlays(plays));
      notify("JSON descargado.");
    } catch {
      notify("No se pudo exportar.");
    }
  }, [notify]);

  const importJson = useCallback(
    async (text: string) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text) as unknown;
      } catch {
        notify("Ese archivo no es JSON.");
        return;
      }
      const plays = parsePlays(parsed);
      if (!plays) {
        notify("El archivo no contiene jugadas de Pizarra.");
        return;
      }
      try {
        for (const play of plays) await persistPlay(play);
        bumpPlays();
        notify(plays.length === 1 ? "1 jugada importada." : `${plays.length} jugadas importadas.`);
      } catch {
        notify("No se pudo importar.");
      }
    },
    [notify, persistPlay],
  );

  const exportPng = useCallback(async () => {
    const exporter = exporterRef.current;
    if (!exporter) {
      notify("La pizarra todavía no está lista.");
      return;
    }
    try {
      if (document.fonts?.load) {
        await document.fonts.load("700 48px Outfit");
      }
      const blob = await exporter();
      const name = stateRef.current.doc.meta?.name ?? "borrador";
      const result = await shareOrDownload(blob, pngFilename(name));
      if (result === "downloaded") notify("Imagen descargada.");
      if (result === "shared") notify("Imagen lista para compartir.");
    } catch {
      notify("No se pudo exportar la imagen.");
    }
  }, [notify]);

  const setFrame = useCallback(
    (index: number) => {
      stopPlayback();
      dispatch({ type: "set-frame", index });
      playStore.set({ playing: false, t: 0, index });
    },
    [playStore, stopPlayback],
  );

  const api = useMemo<BoardApi>(
    () => ({
      ready,
      persistError,
      state,
      tool,
      color,
      lineStyle,
      cap,
      width,
      toolbarOpen,
      showThree,
      floor,
      flatColor,
      playsOpen,
      playsVersion,
      form,
      confirmDelete,
      toast,
      canUndo: canUndo(state),
      canRedo: canRedo(state),
      dirty: savedSig !== "" && docSignature(state.doc) !== savedSig,
      playStore,
      setTool: setToolState,
      setColor: setColorState,
      setLineStyle: setLineStyleState,
      setCap: setCapState,
      setWidth: setWidthState,
      setToolbarOpen: setToolbarOpenState,
      setShowThree: setShowThreeState,
      setFloor: setFloorState,
      setFlatColor: setFlatColorState,
      setPlaysOpen,
      openSave: () => setForm({ mode: "save" }),
      openRename: (play) => setForm({ mode: "rename", play }),
      closeForm: () => setForm(null),
      askDelete: (play) => setConfirmDelete(play),
      cancelDelete: () => setConfirmDelete(null),
      undo: () => edit({ type: "undo" }),
      redo: () => edit({ type: "redo" }),
      clearStrokes: () => edit({ type: "clear-strokes" }),
      toggleView: () => edit({ type: "set-view", view: state.doc.view === "half" ? "full" : "half" }),
      commitStroke: (stroke) => edit({ type: "commit-stroke", stroke }),
      eraseStrokes: (ids) => edit({ type: "erase-strokes", ids }),
      moveToken: (id, x, y, snapshot) => edit({ type: "move-token", id, x, y, snapshot }),
      rotateToken: (id, rotation, snapshot) => edit({ type: "rotate-token", id, rotation, snapshot }),
      removeToken: (id) => edit({ type: "remove-token", id }),
      toggleRosterToken: (id) => {
        const frame = state.doc.frames[state.doc.frameIndex];
        if (frame.tokens.some((token) => token.id === id)) edit({ type: "remove-token", id });
        else {
          const token = tokenFromRoster(id);
          if (token) edit({ type: "add-token", token });
        }
      },
      resetTokens: () => edit({ type: "reset-tokens" }),
      setFrame,
      addFrame: () => {
        if (state.doc.frames.length >= MAX_FRAMES) {
          notify("Una jugada puede tener hasta 40 pasos.");
          return;
        }
        edit({ type: "add-frame" });
      },
      deleteFrame: () => edit({ type: "delete-frame" }),
      togglePlayback,
      stopPlayback,
      saveForm,
      duplicatePlay,
      confirmDeletePlay,
      openPlay,
      askNewPlay,
      confirmNew,
      cancelNewPlay: () => setConfirmNew(false),
      commitNewPlay,
      exportJson,
      importJson,
      exportPng,
      registerExporter: (exporter) => {
        exporterRef.current = exporter;
      },
    }),
    [
      ready,
      persistError,
      state,
      tool,
      color,
      lineStyle,
      cap,
      width,
      toolbarOpen,
      showThree,
      floor,
      flatColor,
      playsOpen,
      playsVersion,
      form,
      confirmDelete,
      confirmNew,
      toast,
      savedSig,
      playStore,
      notify,
      edit,
      setFrame,
      togglePlayback,
      stopPlayback,
      saveForm,
      duplicatePlay,
      confirmDeletePlay,
      openPlay,
      askNewPlay,
      commitNewPlay,
      exportJson,
      importJson,
      exportPng,
    ],
  );

  return (
    <BoardContext.Provider value={api}>
      <PlayStoreContext.Provider value={playStore}>{children}</PlayStoreContext.Provider>
    </BoardContext.Provider>
  );
}

export function useBoard(): BoardApi {
  const value = useContext(BoardContext);
  if (!value) throw new Error("useBoard fuera de BoardProvider");
  return value;
}

export function usePlayback(): PlaySnap {
  const store = useContext(PlayStoreContext);
  if (!store) throw new Error("usePlayback fuera de BoardProvider");
  return useSyncExternalStore(store.subscribe, store.get, store.get);
}
