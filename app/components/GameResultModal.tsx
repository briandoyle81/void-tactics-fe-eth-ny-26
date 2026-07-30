"use client";

import React from "react";
import { getNodeContent } from "../config/campaignNodes";
import { STYLE_LABEL } from "../styles/fontStyles";

interface GameResultModalProps {
  isVictory: boolean;
  myScore: number;
  maxScore: number;
  onClose: () => void;
  /** Primary CTA label + handler — "Back to Games" for PvP, "Return to Campaign" for a mission. */
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  /** Single-player only — swaps VICTORY/DEFEAT for mission-appropriate copy and shows the node title. */
  nodeId?: bigint;
}

// End-of-game overlay for both PvP and single-player — one shared screen,
// not a separate campaign-only component (see feedback_no_parallel_
// components memory). PvP keeps the existing VICTORY/DEFEAT wording;
// passing `nodeId` switches to mission-appropriate copy and title. Display
// only — result/completion are already recorded on-chain by the time this
// renders (Game.sol for the winner, SinglePlayerMatch.onGameEnded ->
// NodeMap.recordCompletion for node unlocks), this never writes anything.
export function GameResultModal({
  isVictory,
  myScore,
  maxScore,
  onClose,
  primaryActionLabel,
  onPrimaryAction,
  nodeId,
}: GameResultModalProps) {
  const accentColor = isVictory ? "var(--color-phosphor-green)" : "var(--color-warning-red)";
  const isMission = nodeId != null;
  const nodeTitle = isMission ? getNodeContent(nodeId!).title : null;

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center bg-black/90 p-4">
      <div
        className="relative w-full max-w-md border-2 bg-near-black p-6 font-mono"
        style={{ borderColor: accentColor, borderRadius: 0 }}
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 border px-2 py-0.5 text-xs text-text-muted hover:text-white"
          style={{ borderColor: "var(--color-gunmetal)", borderRadius: 0 }}
        >
          ✕
        </button>

        <div className="text-center">
          <div
            className="text-3xl font-bold uppercase tracking-widest"
            style={{ ...STYLE_LABEL, color: accentColor }}
          >
            {isMission
              ? isVictory
                ? "Mission Complete"
                : "Mission Failed"
              : isVictory
                ? "Victory"
                : "Defeat"}
          </div>
          {nodeTitle && (
            <div className="mt-2 text-sm uppercase tracking-wider text-text-muted">
              {nodeTitle}
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-sm">
          <span className="text-text-muted">Score</span>
          <span className="font-bold" style={{ color: accentColor }}>
            {myScore}
          </span>
          <span className="text-text-muted">/ {maxScore}</span>
        </div>

        {isMission && (
          <p className="mt-4 text-center text-xs text-text-secondary">
            {isVictory
              ? "The node's completion is recorded — any nodes it unlocks are now available."
              : "This mission is not marked complete. You can try again any time."}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2 sm:flex-row">
          <button
            type="button"
            onClick={onPrimaryAction}
            className="flex-1 border-2 px-4 py-2 text-sm font-bold uppercase tracking-wider transition-colors hover:bg-white/5"
            style={{ borderColor: accentColor, color: accentColor, borderRadius: 0 }}
          >
            {primaryActionLabel}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 border px-4 py-2 text-sm uppercase tracking-wider text-text-secondary transition-colors hover:bg-white/5"
            style={{ borderColor: "var(--color-gunmetal)", borderRadius: 0 }}
          >
            Review Board
          </button>
        </div>
      </div>
    </div>
  );
}
