"use client";

import React from "react";
import { useAccount } from "wagmi";
import { usePvPMatchContract, usePvPMatchOwner } from "../hooks/useGameContract";
import { usePvPMatchWinEffects } from "../hooks/useWinEffects";
import { WinEffectsPicker } from "./WinEffectsPicker";

// Owner-only PvPMatch admin control, gated on Ownable's owner() directly
// (same pattern as LobbyAdminPanel.tsx). Assigns which win effects
// (contracts/IWinEffect.sol) fire for the winner of every non-draw PvP
// match via PvPMatch.setWinEffects — empty by default.
export function PvPMatchAdminPanel() {
  const { address } = useAccount();
  const { data: owner, isLoading: ownerLoading } = usePvPMatchOwner();
  const { address: pvpAddress, abi } = usePvPMatchContract();
  const { data: currentEffects, refetch } = usePvPMatchWinEffects();

  const isOwner =
    !!address && !!owner && address.toLowerCase() === owner.toLowerCase();

  if (ownerLoading || !isOwner) return null;

  return (
    <div
      className="mt-8 space-y-3 border border-purple-400 bg-black/40 p-4"
      style={{ borderRadius: 0 }}
    >
      <h4 className="text-lg font-bold text-purple tracking-widest">
        [PVP WIN EFFECTS]
      </h4>
      <p className="text-xs text-text-muted">
        Fires for the winner of every non-draw PvP match. Empty by default.
      </p>
      <WinEffectsPicker
        transactionId="pvp-match-set-win-effects"
        contractAddress={pvpAddress}
        abi={abi}
        currentEffects={currentEffects}
        onSaved={() => {
          void refetch();
        }}
      />
    </div>
  );
}
