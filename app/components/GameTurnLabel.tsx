"use client";

import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";

// Shared "YOUR TURN • 00:00" label between GameDisplay.tsx (web3) and
// GameDisplayWeb2.tsx (web2) — number-native (see app/types/gameDisplayData.ts).
// Web3's surrounding seize-turn/exceeded-time/progress-bar chrome has no
// web2 counterpart and stays in GameDisplay.tsx; this is just the plain label.
interface GameTurnLabelProps {
  isMyTurn: boolean;
  secondsLeft: number;
}

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = Math.floor(total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export function GameTurnLabel({ isMyTurn, secondsLeft }: GameTurnLabelProps) {
  const color = isMyTurn ? "var(--color-cyan)" : "var(--color-warning-red)";
  return (
    <div
      className="text-sm flex items-center gap-2 uppercase font-semibold tracking-wider"
      style={{ ...STYLE_LABEL, color: "var(--color-text-secondary)" }}
    >
      <span style={{ color }}>{isMyTurn ? "YOUR TURN" : "OPPONENT'S TURN"}</span>
      <span style={{ color: "var(--color-text-muted)" }}>•</span>
      <span className="font-mono" style={{ ...STYLE_MONO, color }}>
        {formatSeconds(secondsLeft)}
      </span>
    </div>
  );
}
