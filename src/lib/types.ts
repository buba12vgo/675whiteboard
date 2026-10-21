export type CourtView = "full" | "half";

export type LineStyle = "solid" | "dashed" | "assist" | "zigzag" | "shot";

export type LineCap = "none" | "arrow" | "tee";

export type Tool = "draw" | "erase" | "move";

export type Category = "jugada" | "ejercicio";

export type TokenKind = "attack" | "defense" | "ball" | "obstacle";

export type Point = {
  x: number;
  y: number;
  p: number;
};

export type Stroke = {
  id: string;
  points: Point[];
  color: string;
  width: number;
  style: LineStyle;
  cap: LineCap;
};

export type Token = {
  id: string;
  kind: TokenKind;
  label: string;
  color: string;
  x: number;
  y: number;
  /** Degrees clockwise. 0 keeps the crescent on the upper half, facing the basket. */
  rotation?: number;
};

export type Frame = {
  id: string;
  strokes: Stroke[];
  tokens: Token[];
};

export type PlayMeta = {
  id: string;
  name: string;
  category: Category;
  notes: string;
};

export type Draft = {
  view: CourtView;
  frames: Frame[];
  frameIndex: number;
  meta: PlayMeta | null;
};

export type Play = PlayMeta & {
  view: CourtView;
  frames: Frame[];
  createdAt: number;
  updatedAt: number;
};

export type PenColor = {
  id: string;
  label: string;
  value: string;
};

export type WidthOption = {
  id: string;
  label: string;
  meters: number;
};

export const PEN_COLORS: PenColor[] = [
  { id: "tinta", label: "Tinta", value: "#1a2332" },
  { id: "blanco", label: "Blanco", value: "#f7f4ee" },
  { id: "rojo", label: "Rojo", value: "#d7263d" },
  { id: "azul", label: "Azul", value: "#1d4e89" },
  { id: "verde", label: "Verde", value: "#1f7a4d" },
  { id: "naranja", label: "Naranja", value: "#e07a2f" },
  { id: "amarillo", label: "Amarillo", value: "#e2b43a" },
  { id: "violeta", label: "Violeta", value: "#6d28d9" },
];

export const WIDTHS: WidthOption[] = [
  { id: "fino", label: "Fino", meters: 0.055 },
  { id: "medio", label: "Medio", meters: 0.1 },
  { id: "grueso", label: "Grueso", meters: 0.17 },
];

export const EXPORT_APP = "pizarra";
export const EXPORT_VERSION = 1;
