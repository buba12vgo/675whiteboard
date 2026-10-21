import { ATTACK_COLOR, DEFENSE_COLOR } from "@/lib/presentation";
import type { Token } from "@/lib/types";

export type RosterEntry = {
  id: string;
  kind: Token["kind"];
  label: string;
  color: string;
  x: number;
  y: number;
};

/** Default 5c5 on the left half, basket toward x = 0. */
export const ROSTER: RosterEntry[] = [
  { id: "atk-1", kind: "attack", label: "1", color: ATTACK_COLOR, x: 11.15, y: 7.5 },
  { id: "atk-2", kind: "attack", label: "2", color: ATTACK_COLOR, x: 8.55, y: 1.85 },
  { id: "atk-3", kind: "attack", label: "3", color: ATTACK_COLOR, x: 8.55, y: 13.15 },
  { id: "atk-4", kind: "attack", label: "4", color: ATTACK_COLOR, x: 6.15, y: 4.55 },
  { id: "atk-5", kind: "attack", label: "5", color: ATTACK_COLOR, x: 6.15, y: 10.45 },
  { id: "def-1", kind: "defense", label: "X1", color: DEFENSE_COLOR, x: 9.35, y: 7.5 },
  { id: "def-2", kind: "defense", label: "X2", color: DEFENSE_COLOR, x: 7.15, y: 2.85 },
  { id: "def-3", kind: "defense", label: "X3", color: DEFENSE_COLOR, x: 7.15, y: 12.15 },
  { id: "def-4", kind: "defense", label: "X4", color: DEFENSE_COLOR, x: 4.35, y: 5.55 },
  { id: "def-5", kind: "defense", label: "X5", color: DEFENSE_COLOR, x: 4.35, y: 9.45 },
  { id: "ball", kind: "ball", label: "", color: "#e36a1c", x: 10.35, y: 6.85 },
  { id: "obstacle", kind: "obstacle", label: "", color: "#1a2332", x: 7, y: 7.5 },
];

export function defaultTokens(): Token[] {
  return ROSTER.filter((entry) => entry.kind !== "obstacle").map((entry) => ({
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    color: entry.color,
    x: entry.x,
    y: entry.y,
  }));
}

export function tokenFromRoster(id: string): Token | null {
  const entry = ROSTER.find((item) => item.id === id);
  if (!entry) return null;
  return {
    id: entry.id,
    kind: entry.kind,
    label: entry.label,
    color: entry.color,
    x: entry.x,
    y: entry.y,
  };
}
