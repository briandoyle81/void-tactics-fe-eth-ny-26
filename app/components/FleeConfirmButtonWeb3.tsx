"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { usePvPMatchContract } from "../hooks/useGameContract";
import { useRoguelikeMatchContract } from "../hooks/useRoguelikeMatch";
import { toast } from "react-hot-toast";

// The web3-specific CONFIRM button for FleeSafetySwitch.tsx's retreat
// modal. Pass to `renderConfirmButton`.
// - PvP: `PvPMatch.flee(gameId)` (flee lives on PvPMatch, not Game).
// - Roguelike: `RoguelikeMatch.retreatRun(gameId)`, which forfeits the
//   match as a loss and ends the run (the contract has no mission-only
//   retreat).
interface FleeConfirmButtonWeb3Props {
  gameId: bigint;
  onSuccess: TransactionFollowUp;
  isRoguelike?: boolean;
}

export function FleeConfirmButtonWeb3({
  gameId,
  onSuccess,
  isRoguelike = false,
}: FleeConfirmButtonWeb3Props) {
  const pvpMatchContract = usePvPMatchContract();
  const roguelikeMatchContract = useRoguelikeMatchContract();
  const contract = isRoguelike ? roguelikeMatchContract : pvpMatchContract;

  return (
    <TransactionButton
      transactionId={`flee-game-${gameId}`}
      contractAddress={contract.address}
      abi={contract.abi}
      functionName={isRoguelike ? "retreatRun" : "flee"}
      args={[gameId]}
      onSuccess={async () => {
        toast.success("Disengaged from battle.");
        await onSuccess();
      }}
      onError={(error) => {
        console.error("Error disengaging:", error);
        const errorMessage = error.message || String(error);
        if (
          errorMessage.includes("User rejected") ||
          errorMessage.includes("User denied")
        ) {
          toast.error("Transaction declined");
        } else {
          toast.error("[ERR] Disengage failed: " + errorMessage);
        }
      }}
      className="flex-1 px-4 py-2 bg-warning-red/20 hover:bg-warning-red/30 text-white font-mono font-bold rounded-none border border-warning-red transition-colors tracking-wider"
      loadingText="DISENGAGING..."
      errorText="[ERR]"
    >
      CONFIRM
    </TransactionButton>
  );
}
