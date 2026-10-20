import type { Token } from "@/lib/types";

export function TokenMark({ token, size }: { token: Token; size: number }) {
  if (token.kind === "ball") {
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <circle cx="32" cy="32" r="28" fill="#e86b1f" stroke="#1a120c" strokeWidth="3" />
        <path d="M6 32h52M32 6v52" stroke="#1a120c" strokeWidth="2.5" fill="none" />
        <path
          d="M14 14c9 8 9 28 0 36M50 14c-9 8-9 28 0 36"
          stroke="#1a120c"
          strokeWidth="2.5"
          fill="none"
        />
      </svg>
    );
  }
  const defense = token.kind === "defense";
  return (
    <span
      className="grid place-items-center font-bold leading-none text-white"
      style={{
        width: size,
        height: size,
        borderRadius: defense ? "30%" : "999px",
        background: token.color,
        fontSize: size * (token.label.length > 2 ? 0.3 : 0.42),
        boxShadow: "0 2px 6px rgba(0,0,0,.35), inset 0 1px 0 rgba(255,255,255,.3)",
        border: defense ? "2px solid rgba(255,255,255,.92)" : "2px solid rgba(255,255,255,.25)",
      }}
    >
      {token.label}
    </span>
  );
}
