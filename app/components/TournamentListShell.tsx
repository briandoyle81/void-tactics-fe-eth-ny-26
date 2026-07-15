"use client";

import React from "react";

interface TournamentListShellProps {
  isLoading: boolean;
  totalCount: number;
  onCreate: () => void;
  activeCards: React.ReactNode[];
  finishedCards: React.ReactNode[];
}

export const TournamentListShell: React.FC<TournamentListShellProps> = ({
  isLoading,
  totalCount,
  onCreate,
  activeCards,
  finishedCards,
}) => (
  <div className="font-mono">
    <div className="flex items-center justify-between mb-5">
      <div className="text-[10px] uppercase tracking-widest text-text-muted">Tournaments</div>
      <button
        onClick={onCreate}
        className="border border-phosphor-green/60 px-3 py-1.5 text-xs text-phosphor-green font-bold tracking-wider hover:border-phosphor-green hover:bg-phosphor-green/5 transition-colors"
      >
        + New Tournament
      </button>
    </div>

    {isLoading && (
      <div className="flex items-center gap-2 py-8 text-xs text-text-muted">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-phosphor-green/30 border-t-phosphor-green" />
        Loading…
      </div>
    )}

    {!isLoading && totalCount === 0 && (
      <div className="py-12 text-center text-xs text-text-muted">
        No tournaments yet.{" "}
        <button onClick={onCreate} className="text-phosphor-green hover:underline">
          Create the first one.
        </button>
      </div>
    )}

    {activeCards.length > 0 && (
      <section className="mb-6">
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Open</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{activeCards}</div>
      </section>
    )}

    {finishedCards.length > 0 && (
      <section>
        <div className="text-[10px] uppercase tracking-widest text-text-muted mb-3">Completed</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">{finishedCards}</div>
      </section>
    )}
  </div>
);
