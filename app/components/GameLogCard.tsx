"use client";

import React from "react";

function formatSeconds(total: number): string {
  const m = Math.floor(total / 60).toString().padStart(2, "0");
  const s = (total % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

// Shared between Games.tsx (web3) and GamesWeb2.tsx (web2) — the
// "[ENGAGEMENT LOG]" list's per-game card, ported verbatim. `identityRows`
// is the one genuinely-different slot: web3 shows Creator/Joiner addresses
// (meaningful in a wallet context), web2 shows the map name + "You are"
// role (web2 user ids aren't meaningful to display, but map data is
// available) — both render as `data-readout` rows in the same position.
interface GameLogCardProps {
  gameIdLabel: string;
  isFinished: boolean;
  isDraw: boolean;
  isVictory: boolean;
  lobbyIdLabel: string;
  /** Rows rendered between Lobby and Date — see doc comment above. */
  identityRows: React.ReactNode;
  dateLabel: string;
  creatorScore: number;
  joinerScore: number;
  maxScore: number;
  isMyTurn: boolean;
  turnSecondsRemaining: number;
  onSelect: () => void;
}

export function GameLogCard({
  gameIdLabel,
  isFinished,
  isDraw,
  isVictory,
  lobbyIdLabel,
  identityRows,
  dateLabel,
  creatorScore,
  joinerScore,
  maxScore,
  isMyTurn,
  turnSecondsRemaining,
  onSelect,
}: GameLogCardProps) {
  const accentClass = isFinished
    ? isDraw
      ? "border-purple"
      : isVictory
        ? "border-phosphor-green"
        : "border-warning-red"
    : "border-amber";
  const accentColor = isFinished
    ? isDraw
      ? "var(--color-purple)"
      : isVictory
        ? "var(--color-phosphor-green)"
        : "var(--color-warning-red)"
    : "var(--color-amber)";

  return (
    <div
      className={`corner-bracket border-2 ${accentClass} bg-near-black p-4 rounded-none`}
      style={{ "--bracket-color": accentColor } as React.CSSProperties}
    >
      {/* Card header */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <h3 className="font-mono font-bold tracking-wider text-text-primary">
          ENGAGEMENT #{gameIdLabel}
        </h3>
        <span
          className={`shrink-0 border px-2 py-0.5 font-mono text-xs font-bold tracking-wider rounded-none ${
            isFinished
              ? isDraw
                ? "border-purple/50 bg-purple/10 text-purple"
                : isVictory
                  ? "border-phosphor-green/50 bg-phosphor-green/10 text-phosphor-green"
                  : "border-warning-red/50 bg-warning-red/10 text-warning-red"
              : "border-amber/50 bg-amber/10 text-amber"
          }`}
        >
          {isFinished ? (isDraw ? "DRAW" : isVictory ? "VICTORY" : "DEFEAT") : "IN PROGRESS"}
        </span>
      </div>

      {/* Data readouts */}
      <div className="space-y-0">
        <div className="data-readout">
          <span className="data-readout-label">Lobby</span>
          <span className="font-mono text-xs">{lobbyIdLabel}</span>
        </div>
        {identityRows}
        <div className="data-readout">
          <span className="data-readout-label">Date</span>
          <span className="font-mono text-xs">{dateLabel}</span>
        </div>
        <div className="data-readout">
          <span className="data-readout-label">Score</span>
          <span className="font-mono text-xs font-bold">
            {creatorScore} / {joinerScore}
            <span className="opacity-40 font-normal"> of {maxScore}</span>
          </span>
        </div>
        {!isFinished && (
          <>
            <div className="data-readout">
              <span className="data-readout-label">Initiative</span>
              <span
                className={`font-mono text-xs font-bold ${isMyTurn ? "text-phosphor-green" : "text-warning-red"}`}
              >
                {isMyTurn ? "YOURS" : "OPPONENT"}
              </span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Turn Timer</span>
              <span
                className={`font-mono text-xs font-bold ${turnSecondsRemaining <= 10 ? "text-warning-red" : ""}`}
              >
                {formatSeconds(turnSecondsRemaining)}
              </span>
            </div>
          </>
        )}
      </div>

      {/* Action */}
      <div className="mt-4 pt-3 border-t border-gunmetal">
        <button
          className={`w-full rounded-none border-2 py-2.5 font-mono font-bold tracking-widest transition-all duration-200 text-sm ${
            isFinished
              ? "border-gunmetal text-text-muted hover:border-cyan hover:text-cyan hover:bg-cyan/5"
              : "border-cyan text-cyan hover:bg-cyan/10"
          }`}
          onClick={onSelect}
        >
          {isFinished ? "VIEW RECORD" : "ENTER ENGAGEMENT"}
        </button>
      </div>
    </div>
  );
}
