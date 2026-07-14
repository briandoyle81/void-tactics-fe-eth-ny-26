"use client";

import React from "react";
import { STYLE_LABEL, STYLE_MONO } from "../styles/fontStyles";
import { GameTurnLabel } from "./GameTurnLabel";

function ResyncIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
      className="w-4 h-4"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
      />
    </svg>
  );
}

// Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) —
// the turn-indicator/countdown 3-way state (normal countdown / "your
// timer expired, opponent may claim" self-facing warning / "claim
// opponent's timeout" button), ported verbatim from GameDisplay.tsx.
// `claimTimeoutButton` is caller-supplied (web3: `TransactionButton`
// calling `Game.endGameOnTimeout`; web2: a REST call to
// `/api/games/[id]/timeout`) since the claim action is a real data
// difference.
interface GameTurnTimerPanelProps {
  hasExceededTime: boolean;
  canSeizeTurn: boolean;
  isMyTurn: boolean;
  secondsLeft: number;
  turnPercentRemaining: number;
  onResync: () => void;
  claimTimeoutButton: React.ReactNode;
}

export function GameTurnTimerPanel({
  hasExceededTime,
  canSeizeTurn,
  isMyTurn,
  secondsLeft,
  turnPercentRemaining,
  onResync,
  claimTimeoutButton,
}: GameTurnTimerPanelProps) {
  if (hasExceededTime) {
    return (
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between gap-2" style={STYLE_LABEL}>
          <span className="text-sm font-bold uppercase tracking-wider" style={{ color: "var(--color-cyan)" }}>
            YOUR TURN
          </span>
          <span
            className="font-mono text-sm animate-timeout-soft"
            style={{ ...STYLE_MONO, color: "var(--color-warning-red)" }}
          >
            00:00
          </span>
        </div>
        <div
          className="text-sm font-bold uppercase tracking-wider animate-victory-flash"
          style={{ color: "var(--color-warning-red)", ...STYLE_LABEL }}
        >
          Opponent can now claim victory
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-1.5 overflow-hidden"
            style={{ backgroundColor: "var(--color-gunmetal)", borderRadius: 0 }}
          >
            <div
              className="h-full animate-victory-flash"
              style={{ width: "100%", backgroundColor: "var(--color-warning-red)", borderRadius: 0 }}
            />
          </div>
          <button
            onClick={onResync}
            className="p-1 text-text-muted hover:text-cyan transition-colors"
            title="Resync game state"
          >
            <ResyncIcon />
          </button>
        </div>
      </div>
    );
  }

  if (canSeizeTurn) {
    return (
      <div className="flex flex-col gap-1.5">
        <p
          className="text-sm font-bold uppercase tracking-wider"
          style={{ color: "var(--color-amber)", ...STYLE_LABEL }}
        >
          Opponent&apos;s timer expired
        </p>
        <div className="text-sm">
          <div
            className="inline-block"
            style={{
              ...STYLE_LABEL,
              borderColor: "var(--color-amber)",
              color: "var(--color-amber)",
              backgroundColor: "var(--color-steel)",
              borderWidth: "2px",
              borderStyle: "solid",
              borderRadius: 0,
            }}
          >
            {claimTimeoutButton}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="flex-1 h-1.5 overflow-hidden"
            style={{ backgroundColor: "var(--color-gunmetal)", borderRadius: 0 }}
          >
            <div
              className="h-full animate-timeout-bar"
              style={{ width: "100%", backgroundColor: "var(--color-warning-red)", borderRadius: 0 }}
            />
          </div>
          <button
            onClick={onResync}
            className="p-1 text-text-muted hover:text-cyan transition-colors"
            title="Resync game state"
          >
            <ResyncIcon />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1.5">
      <GameTurnLabel isMyTurn={isMyTurn} secondsLeft={secondsLeft} />
      <div className="flex items-center gap-2">
        <div
          className="flex-1 h-1.5 overflow-hidden"
          style={{ backgroundColor: "var(--color-gunmetal)", borderRadius: 0 }}
        >
          <div
            className="h-full transition-all duration-1000 ease-linear"
            style={{
              width: `${turnPercentRemaining}%`,
              backgroundColor: "var(--color-warning-red)",
              borderRadius: 0,
            }}
          />
        </div>
        <button
          onClick={onResync}
          className="p-1 text-text-muted hover:text-cyan transition-colors"
          title="Refresh game state"
        >
          <ResyncIcon />
        </button>
      </div>
      <p
        className="text-[10px] uppercase tracking-wider"
        style={{
          color: "color-mix(in srgb, var(--color-text-muted) 70%, transparent)",
          fontFamily: "var(--font-rajdhani), sans-serif",
        }}
      >
        {isMyTurn
          ? "Opponent may claim victory if timer expires"
          : "You may claim victory if their timer expires"}
      </p>
    </div>
  );
}
