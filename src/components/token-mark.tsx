import { DEFENSE_CIRCLE_R, DEFENSE_CRESCENT, DEFENSE_RING, DEFENSE_VIEW, defenseNumber } from "@/lib/defense-mark";
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
    const half = DEFENSE_VIEW / 2;
    return (
      <svg width={size} height={size} viewBox={`${-half} ${-half} ${DEFENSE_VIEW} ${DEFENSE_VIEW}`} aria-hidden="true">
        <path d={DEFENSE_CRESCENT} fill={token.color} />
        <circle cx="0" cy="0" r={DEFENSE_CIRCLE_R} fill="#f6f1e6" stroke={token.color} strokeWidth={DEFENSE_RING} />
        <text
          x="0"
          y="0.5"
          textAnchor="middle"
          dominantBaseline="central"
          fontSize="20"
          fontWeight="700"
          fill={token.color}
          fontFamily="Outfit, sans-serif"
        >
          {defenseNumber(token.label)}
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
