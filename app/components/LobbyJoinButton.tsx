"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount } from "wagmi";
import posthog from "posthog-js";

interface LobbyJoinButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: TransactionFollowUp;
  onError?: (error: Error) => void;
}

const LOBBY_JOIN_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_lobbyId", type: "uint256" }],
    name: "joinLobby",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyJoinButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyJoinButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    return true;
  }, [address]);

  return (
    <TransactionButton
      transactionId={`join-lobby-${lobbyId}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_JOIN_ABI}
      functionName="joinLobby"
      args={[lobbyId]}
      className={className}
      disabled={disabled}
      loadingText="[JOINING...]"
      errorText="[ERROR JOINING]"
      onSuccess={async () => {
        posthog.capture("lobby_joined", { lobby_id: lobbyId.toString() });
        await onSuccess?.();
      }}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
