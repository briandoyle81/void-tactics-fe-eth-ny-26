"use client";

import React from "react";
import { useAccount } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS } from "../config/contracts";
import { BASE_SEPOLIA_TOURNAMENT_ADDRESS, useTournamentOwner } from "../hooks/useTournament";
import { useTournamentWinEffects } from "../hooks/useWinEffects";
import { WinEffectsPicker } from "./WinEffectsPicker";

const TOURNAMENT_ABI = CONTRACT_ABIS.TOURNAMENT as Abi;

// Owner-only Tournament admin control, gated on Ownable's owner() directly
// — NOT the same gate as TournamentAdminPanel.tsx, which is scoped to a
// single tournament's creator (summary.creator). Tournament.setWinEffects
// is a global, contract-owner-only setter (fires for every tournament's
// champion), so it needs its own owner()-gated surface rather than being
// embedded in the per-tournament creator panel.
export function TournamentWinEffectsAdminPanel() {
  const { address } = useAccount();
  const { data: owner, isLoading: ownerLoading } = useTournamentOwner();
  const { data: currentEffects, refetch } = useTournamentWinEffects();

  const isOwner =
    !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  if (ownerLoading || !isOwner) return null;

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">
        [TOURNAMENT WIN EFFECTS]
      </h4>
      <p className="text-xs text-text-muted">
        Fires for the champion of every finalized tournament. Empty by default.
      </p>
      <WinEffectsPicker
        transactionId="tournament-set-win-effects"
        contractAddress={BASE_SEPOLIA_TOURNAMENT_ADDRESS}
        abi={TOURNAMENT_ABI}
        currentEffects={currentEffects}
        onSaved={() => {
          void refetch();
        }}
      />
    </div>
  );
}
