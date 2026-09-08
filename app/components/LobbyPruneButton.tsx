"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount } from "wagmi";
import posthog from "posthog-js";

interface LobbyPruneButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

const LOBBY_PRUNE_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_lobbyId", type: "uint256" }],
    name: "pruneStaleLobby",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

// pruneStaleLobby is permissionless — no wallet-connection requirement
// beyond having one to sign with, unlike LobbyJoinButton's role-specific
// validation. See docs/update/Frontend_Updates_2026-08-27.md §4.
export function LobbyPruneButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyPruneButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    return true;
  }, [address]);

  return (
    <TransactionButton
      transactionId={`prune-lobby-${lobbyId}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_PRUNE_ABI}
      functionName="pruneStaleLobby"
      args={[lobbyId]}
      className={className}
      disabled={disabled}
      loadingText="[PRUNING...]"
      errorText="[ERROR PRUNING]"
      onSuccess={() => {
        posthog.capture("lobby_pruned", { lobby_id: lobbyId.toString() });
        onSuccess?.();
      }}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
