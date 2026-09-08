"use client";

import React from "react";
import { STYLE_LABEL } from "../styles/fontStyles";

// Shared between GameDisplay.tsx (web3) and GameDisplayWeb2.tsx (web2) — the
// bottom-left replay transport (prev/next/play-pause/exit + step label) and
// the top-left "Replay · ..." corner banner. Purely presentational: each
// side's *data source* stays genuinely different (web3: client-only
// localStorage GameRecord; web2: server-authoritative Prisma GameTurn
// history via /api/games/[id]/replay) and lives in that file's own
// step/autoplay state — only this chrome is shared.
interface GameReplayControlsProps {
  stepLabel: string;
  onPrev: () => void;
  canPrev: boolean;
  onNext: () => void;
  canNext: boolean;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onExit: () => void;
  /** Rendered after the step label — e.g. web2's score/round summary. */
  extraInfo?: React.ReactNode;
}

export function GameReplayControls({
  stepLabel,
  onPrev,
  canPrev,
  onNext,
  canNext,
  isPlaying,
  onTogglePlay,
  onExit,
  extraInfo,
}: GameReplayControlsProps) {
  return (
    <div
      className="flex items-center gap-2 flex-wrap border-2 border-solid px-2 py-1"
      style={{
        borderColor: "var(--color-steel)",
        backgroundColor: "color-mix(in srgb, var(--color-near-black) 88%, transparent)",
        borderRadius: 0,
      }}
    >
      <button
        type="button"
        onClick={onPrev}
        disabled={!canPrev}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        ◀ Prev
      </button>
      <span className="text-[11px] font-mono text-text-muted min-w-[5rem] text-center">
        {stepLabel}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={!canNext}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-steel)", color: "var(--color-cyan)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        Next ▶
      </button>
      <button
        type="button"
        onClick={onTogglePlay}
        disabled={!canNext}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid disabled:opacity-40"
        style={{
          ...STYLE_LABEL,
          borderColor: isPlaying ? "var(--color-cyan)" : "var(--color-steel)",
          color: isPlaying ? "var(--color-cyan)" : "var(--color-text-muted)",
          backgroundColor: "transparent",
          borderRadius: 0,
        }}
      >
        {isPlaying ? "⏸ Pause" : "▶▶ Play"}
      </button>
      <button
        type="button"
        onClick={onExit}
        className="px-2 py-0.5 text-[11px] uppercase tracking-wider border border-solid"
        style={{ ...STYLE_LABEL, borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", backgroundColor: "transparent", borderRadius: 0 }}
      >
        ✕ Exit
      </button>
      {extraInfo}
    </div>
  );
}

/** Top-left "Replay · Start / Move N/M" corner banner — see GameReplayControls' doc comment. */
export function GameReplayBanner({ label }: { label: string }) {
  return (
    <div
      className="pointer-events-none absolute top-1 left-1 z-[230] px-2 py-0.5 text-[10px] uppercase tracking-wider font-bold"
      style={{
        ...STYLE_LABEL,
        color: "var(--color-cyan)",
        backgroundColor: "color-mix(in srgb, var(--color-near-black) 85%, transparent)",
        border: "1px solid var(--color-steel)",
      }}
    >
      {label}
    </div>
  );
}
