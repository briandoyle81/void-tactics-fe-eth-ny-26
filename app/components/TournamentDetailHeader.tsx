"use client";

import React from "react";
import { tournamentStateColor, tournamentStateLabel } from "../utils/tournamentStateDisplay";

interface TournamentDetailHeaderProps {
  idLabel: string;
  state: number;
  onBack: () => void;
  /** Web2 and web3 tournaments no longer share a TournamentState ordinal
   * space (web3 gained a `Starting` state web2 has no equivalent of) —
   * defaults to "web3" since that's this component's more common caller. */
  flow?: "web2" | "web3";
}

export const TournamentDetailHeader: React.FC<TournamentDetailHeaderProps> = ({
  idLabel,
  state,
  onBack,
  flow = "web3",
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
        className={`border px-2 py-0.5 text-[10px] font-bold tracking-wider ${tournamentStateColor(state, flow)}`}
      >
        {tournamentStateLabel(state, flow)}
      </span>
    </div>
  </div>
);
