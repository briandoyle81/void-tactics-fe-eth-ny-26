"use client";

import React from "react";

// Shared between Profile.tsx (web3) and ProfileWeb2.tsx (web2) — the
// ENGAGEMENT HISTORY card, ported verbatim from Profile.tsx. `opponentLabel`
// is optional since web2 has no client-side username lookup yet.
export interface GameHistoryRowData {
  id: string;
  outcomeText: string;
  outcomeColor: string;
  dateLabel: string;
  opponentLabel?: string;
  playerScore: number | null;
  maxScore: number;
  round: number;
  activeShips: number | null;
  inProgress: boolean;
}

interface GameHistoryListProps {
  isSignedIn: boolean;
  isLoading: boolean;
  rows: GameHistoryRowData[];
  onRowClick: (id: string) => void;
}

export function GameHistoryList({ isSignedIn, isLoading, rows, onRowClick }: GameHistoryListProps) {
  if (!isSignedIn) return null;

  return (
    <div
      className="corner-bracket border bg-black/40 p-4"
      style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-cyan mb-4 tracking-widest">
        [ENGAGEMENT HISTORY]
      </h4>
      {isLoading ? (
        <p className="text-sm font-mono text-text-muted animate-pulse tracking-widest">&gt;&gt; RETRIEVING RECORDS...</p>
      ) : rows.length === 0 ? (
        <p className="text-sm font-mono text-text-muted">[NO RECORDS FOUND]</p>
      ) : (
        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {rows.map((row) => (
            <div
              key={row.id}
              className="border border-gunmetal bg-black/20 px-3 py-2 text-xs cursor-pointer transition-colors duration-100 hover:border-cyan hover:bg-black/40"
              style={{ borderRadius: 0 }}
              onClick={() => onRowClick(row.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onRowClick(row.id); }}
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-mono font-bold shrink-0">
                    Game #{row.id}
                  </span>
                  <span className={`font-bold shrink-0 ${row.outcomeColor}`}>
                    [{row.outcomeText}]
                  </span>
                </div>
                <span className="opacity-50 shrink-0">
                  {row.dateLabel}
                </span>
              </div>
              {row.opponentLabel && (
                <div className="mt-0.5 opacity-50 font-mono">
                  vs {row.opponentLabel}
                </div>
              )}
              <div className="flex items-center gap-4 mt-1 opacity-70">
                {row.playerScore !== null && (
                  <span className="font-mono">
                    <span className="opacity-60">score </span>
                    <span className="font-bold">{row.playerScore}</span>
                    <span className="opacity-60"> / {row.maxScore}</span>
                  </span>
                )}
                {row.round > 0 && (
                  <span className="font-mono">
                    <span className="opacity-60">rnd </span>
                    <span className="font-bold">{row.round}</span>
                  </span>
                )}
                {row.activeShips !== null && row.inProgress && (
                  <span className="font-mono">
                    <span className="opacity-60">ships </span>
                    <span className="font-bold">{row.activeShips}</span>
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
