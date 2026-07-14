"use client";

import React from "react";

// Shared between Profile.tsx (web3) and ProfileWeb2.tsx (web2) — the
// STATISTICS + ACHIEVEMENTS card pair, ported verbatim from Profile.tsx.
// `draws` is optional/omitted for web3 (on-chain games have no tie concept
// yet); `signInPrompt` differs (wallet vs session) so it's caller-supplied.
export interface PlayerStatsPanelData {
  wins: number;
  losses: number;
  draws?: number;
  inProgress: number;
  winRate: number;
  total: number;
}

interface PlayerStatsPanelProps {
  isSignedIn: boolean;
  signInPrompt: string;
  stats: PlayerStatsPanelData;
}

export function PlayerStatsPanel({ isSignedIn, signInPrompt, stats }: PlayerStatsPanelProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div
        className="corner-bracket border bg-black/40 p-4"
        style={{ borderColor: "var(--color-cyan)", borderRadius: 0 }}
      >
        <h4 className="text-lg font-bold text-cyan mb-2 tracking-widest">
          [STATISTICS]
        </h4>
        {isSignedIn ? (
          <div className="space-y-0 mt-2">
            <div className="data-readout">
              <span className="data-readout-label">Wins</span>
              <span className="font-bold text-phosphor-green font-mono text-xs">{stats.wins}</span>
            </div>
            <div className="data-readout">
              <span className="data-readout-label">Losses</span>
              <span className="font-bold text-warning-red font-mono text-xs">{stats.losses}</span>
            </div>
            {!!stats.draws && stats.draws > 0 && (
              <div className="data-readout">
                <span className="data-readout-label">Draws</span>
                <span className="font-bold text-purple font-mono text-xs">{stats.draws}</span>
              </div>
            )}
            <div className="data-readout">
              <span className="data-readout-label">Win Rate</span>
              <span className="font-bold font-mono text-xs">{stats.winRate}%</span>
            </div>
            {stats.inProgress > 0 && (
              <div className="data-readout">
                <span className="data-readout-label">In Progress</span>
                <span className="font-bold text-amber font-mono text-xs">{stats.inProgress}</span>
              </div>
            )}
            <div className="data-readout">
              <span className="data-readout-label">Total</span>
              <span className="font-mono text-xs opacity-60">{stats.total}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm font-mono opacity-80 tracking-wider">
            {signInPrompt}
          </p>
        )}
      </div>
      <div
        className="corner-bracket corner-bracket-purple border border-purple bg-black/40 p-4"
        style={{ borderRadius: 0 }}
      >
        <h4 className="text-lg font-bold text-purple mb-2 tracking-widest">
          [ACHIEVEMENTS]
        </h4>
        <p className="text-sm font-mono opacity-50 tracking-wider">Operational tracking coming in a future update.</p>
      </div>
    </div>
  );
}
