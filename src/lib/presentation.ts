import type { Token, TokenKind } from "@/lib/types";

export const ATTACK_COLOR = "#17324d";
export const DEFENSE_COLOR = "#6e2430";

export const ROLE_SWATCHES = [
  { id: "marino", label: "Marino", value: "#17324d" },
  { id: "tinta", label: "Tinta", value: "#1c2430" },
  { id: "bosque", label: "Bosque", value: "#1d4336" },
  { id: "granate", label: "Granate", value: "#6e2430" },
  { id: "pizarra", label: "Pizarra", value: "#4a5562" },
] as const;

export function isRoleColor(value: unknown): value is string {
  return typeof value === "string" && ROLE_SWATCHES.some((swatch) => swatch.value === value);
}

export function roleColor(kind: TokenKind, attack: string, defense: string, own: string): string {
  if (kind === "attack") return attack;
  if (kind === "defense") return defense;
  return own;
}

/**
 * Screen-space seat for the ball: lower-right of the holder, tucked a little
 * into the ring so it reads as possession. `discPx` and `ballPx` are drawn
 * diameters. Returns court coordinates.
 */
export function ballBesideHolder(
  holder: Pick<Token, "x" | "y">,
  toScreen: (x: number, y: number) => { x: number; y: number },
  toCourt: (x: number, y: number) => { x: number; y: number },
  discPx: number,
  ballPx: number,
): { x: number; y: number } {
  const screen = toScreen(holder.x, holder.y);
  const dist = discPx / 2 + ballPx / 2 - ballPx * 0.2;
  const angle = 0.68;
  return toCourt(screen.x + Math.cos(angle) * dist, screen.y + Math.sin(angle) * dist);
}
