"use client";

import React from "react";
import { tournamentStateColor, tournamentStateLabel } from "../utils/tournamentStateDisplay";

interface TournamentDetailHeaderProps {
  idLabel: string;
  state: number;
  onBack: () => void;
}

export const TournamentDetailHeader: React.FC<TournamentDetailHeaderProps> = ({
  idLabel,
  state,
  onBack,
}) => (
  <div className="flex items-center gap-3 mb-4">
    <button
      onClick={onBack}
      className="text-xs text-text-muted hover:text-text-secondary transition-colors"
    >
      ← Back
    </button>
    <div className="flex-1 flex items-center gap-3">
      <span className="text-sm font-bold text-text-secondary">{idLabel}</span>
      <span
        className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${tournamentStateColor(state)}`}
      >
        {tournamentStateLabel(state)}
      </span>
    </div>
  </div>
);
