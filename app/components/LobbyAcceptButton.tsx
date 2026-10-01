"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount } from "wagmi";
import posthog from "posthog-js";

interface LobbyAcceptButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: TransactionFollowUp;
  onError?: (error: Error) => void;
}

const LOBBY_ACCEPT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_lobbyId", type: "uint256" }],
    name: "acceptGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyAcceptButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyAcceptButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    return true;
  }, [address]);

  return (
    <TransactionButton
      transactionId={`accept-game-${lobbyId}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_ACCEPT_ABI}
      functionName="acceptGame"
      args={[lobbyId]}
      className={className}
      disabled={disabled}
      loadingText="[ACCEPTING...]"
      errorText="[ERROR ACCEPTING]"
      onSuccess={async () => {
        posthog.capture("game_accepted", { lobby_id: lobbyId.toString() });
        await onSuccess?.();
      }}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}

