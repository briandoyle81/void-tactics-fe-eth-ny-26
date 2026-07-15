"use client";

import React from "react";

interface TournamentDetailStatsRowProps {
  prizeLabel?: string | null;
  playersLabel: string;
  entryFeeLabel?: string | null;
  creatorLabel: string;
}

export const TournamentDetailStatsRow: React.FC<TournamentDetailStatsRowProps> = ({
  prizeLabel,
  playersLabel,
  entryFeeLabel,
  creatorLabel,
}) => (
  <div className="flex flex-wrap gap-4 text-xs mb-5 pb-4 border-b border-gunmetal/40">
    {prizeLabel && (
      <div>
        <span className="text-text-muted">Prize </span>
        <span className="text-phosphor-green font-bold">{prizeLabel}</span>
      </div>
    )}
    <div>
      <span className="text-text-muted">Players </span>
      <span className="text-text-secondary">{playersLabel}</span>
    </div>
    {entryFeeLabel && (
      <div>
        <span className="text-text-muted">Entry </span>
        <span className="text-text-secondary">{entryFeeLabel}</span>
      </div>
    )}
    <div>
      <span className="text-text-muted">Creator </span>
      <span className="text-text-secondary">{creatorLabel}</span>
    </div>
  </div>
);
