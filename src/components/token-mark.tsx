import type { Token } from "@/lib/types";

export function TokenMark({ token, size, holding = false }: { token: Token; size: number; holding?: boolean }) {
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
  if (token.kind === "obstacle") {
    const box = size * 0.72;
    return (
      <span
        aria-hidden="true"
        style={{
          width: box,
          height: box,
          background: "#f6f1e6",
          border: `${Math.max(2, size * 0.08)}px solid #1a2332`,
        }}
      />
    );
  }
  if (token.kind === "defense") {
    const number = token.label.replace(/^X/i, "");
    return (
      <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
        <path d="M8 10 56 54M56 10 8 54" stroke={token.color} strokeWidth="8" strokeLinecap="round" />
        <circle cx="32" cy="32" r="12" fill="#f6f1e6" stroke={token.color} strokeWidth="2.5" />
        <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="700" fill={token.color}>
          {number}
        </text>
      </svg>
    );
  }
  const dot = Math.max(12, size * 0.32);
  return (
    <span
      className="relative grid place-items-center font-bold leading-none"
      style={{
        width: size,
        height: size,
        borderRadius: "999px",
        background: "#f6f1e6",
        color: token.color,
        fontSize: size * 0.42,
        border: `${Math.max(2, size * 0.07)}px solid ${token.color}`,
      }}
    >
      {token.label}
      {holding && (
        <span
          aria-hidden="true"
          className="absolute rounded-full"
          style={{
            right: -dot * 0.15,
            bottom: -dot * 0.15,
            width: dot,
            height: dot,
            background: "#e86b1f",
            border: "2px solid #1a120c",
          }}
        />
      )}
    </span>
  );
}
