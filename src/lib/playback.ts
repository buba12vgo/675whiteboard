import type { Token } from "@/lib/types";

export type DisplayToken = Token & { opacity: number };

export function interpolateTokens(from: Token[], to: Token[], t: number): DisplayToken[] {
  const next = new Map(to.map((token) => [token.id, token]));
  const seen = new Set<string>();
  const out: DisplayToken[] = [];
  for (const token of from) {
    seen.add(token.id);
    const target = next.get(token.id);
    if (!target) {
      out.push({ ...token, opacity: 1 - t });
      continue;
    }
    out.push({
      ...token,
      x: token.x + (target.x - token.x) * t,
      y: token.y + (target.y - token.y) * t,
      opacity: 1,
    });
  }
  for (const token of to) {
    if (!seen.has(token.id)) out.push({ ...token, opacity: t });
  }
  return out;
}
