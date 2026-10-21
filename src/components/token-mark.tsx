import type { PointerEvent as ReactPointerEvent } from "react";
import {
  ATTACK_VIEW,
  BALL_DRAW_R,
  BALL_FILL,
  BALL_INK,
  DEFENSE_CIRCLE_R,
  DEFENSE_CRESCENT,
  DEFENSE_RING,
  DEFENSE_VIEW,
  DISC_FILL,
  MARK_FONT,
  defenseNumber,
} from "@/lib/defense-mark";
import type { Token } from "@/lib/types";

type Handlers = {
  onPointerDown?: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerMove?: (event: ReactPointerEvent<SVGElement>) => void;
  onPointerUp?: () => void;
};

type MarkProps = Handlers & {
  token: Token;
  size: number;
};

const svgProps = {
  "aria-hidden": true as const,
  shapeRendering: "geometricPrecision" as const,
  style: { display: "block", overflow: "visible" },
};

export function TokenMark({ token, size, onPointerDown, onPointerMove, onPointerUp }: MarkProps) {
  if (token.kind === "ball") return <BallMark size={size} />;
  if (token.kind === "obstacle") {
    const box = size * 0.72;
    const stroke = Math.max(2, size * 0.075);
    return (
      <span
        aria-hidden="true"
        style={{
          width: box,
          height: box,
          background: DISC_FILL,
          border: `${stroke}px solid #1a2332`,
        }}
      />
    );
  }
  if (token.kind === "defense") {
    return (
      <DefenseMark
        size={size}
        color={token.color}
        label={defenseNumber(token.label)}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
      />
    );
  }
  return <DiscMark size={size} color={token.color} label={token.label} view={ATTACK_VIEW} />;
}

function DiscFace({ color, label, handlers }: { color: string; label: string; handlers?: Handlers }) {
  return (
    <>
      <circle
        cx="0"
        cy="0"
        r={DEFENSE_CIRCLE_R}
        fill={DISC_FILL}
        stroke={color}
        strokeWidth={DEFENSE_RING}
        style={{ pointerEvents: handlers ? "auto" : "none" }}
        {...handlers}
      />
      <text
        x="0"
        y="1.2"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize={MARK_FONT}
        fontWeight="600"
        fill={color}
        fontFamily="Outfit, sans-serif"
        style={{ pointerEvents: "none" }}
      >
        {label}
      </text>
    </>
  );
}

function DiscMark({ size, color, label, view }: { size: number; color: string; label: string; view: number }) {
  const half = view / 2;
  return (
    <svg width={size} height={size} viewBox={`${-half} ${-half} ${view} ${view}`} {...svgProps}>
      <DiscFace color={color} label={label} />
    </svg>
  );
}

function DefenseMark({ size, color, label, ...handlers }: { size: number; color: string; label: string } & Handlers) {
  const half = DEFENSE_VIEW / 2;
  return (
    <svg
      width={size}
      height={size}
      viewBox={`${-half} ${-half} ${DEFENSE_VIEW} ${DEFENSE_VIEW}`}
      {...svgProps}
      style={{ ...svgProps.style, pointerEvents: "none" }}
    >
      <path
        d={DEFENSE_CRESCENT}
        fill={color}
        fillRule="evenodd"
        style={{ pointerEvents: "auto" }}
        {...handlers}
      />
      <DiscFace color={color} label={label} handlers={handlers} />
    </svg>
  );
}

function BallMark({ size }: { size: number }) {
  const r = 100 * BALL_DRAW_R;
  const ring = 5.5;
  const seam = r - ring;
  return (
    <svg width={size} height={size} viewBox="0 0 100 100" {...svgProps}>
      <circle cx="50" cy="50" r={r} fill={BALL_FILL} stroke={BALL_INK} strokeWidth={ring} />
      <path
        d={`M ${50 - seam} 50 H ${50 + seam} M 50 ${50 - seam} V ${50 + seam}`}
        stroke={BALL_INK}
        strokeWidth="3.6"
        fill="none"
      />
    </svg>
  );
}
