"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { usePvPMatchContract } from "../hooks/useGameContract";
import { toast } from "react-hot-toast";

// The web3-specific CONFIRM button for FleeSafetySwitch.tsx's retreat
// modal — wraps the contract `flee` call. Pass to `renderConfirmButton`.
// `flee` lives on PvPMatch (not Game) — see usePvPMatchContract.
interface FleeConfirmButtonWeb3Props {
  gameId: bigint;
  onSuccess: () => void;
}

export function FleeConfirmButtonWeb3({ gameId, onSuccess }: FleeConfirmButtonWeb3Props) {
  const pvpMatchContract = usePvPMatchContract();

  return (
    <TransactionButton
      transactionId={`flee-game-${gameId}`}
      contractAddress={pvpMatchContract.address}
      abi={pvpMatchContract.abi}
      functionName="flee"
      args={[gameId]}
      onSuccess={() => {
        toast.success("Disengaged from battle.");
        onSuccess();
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
