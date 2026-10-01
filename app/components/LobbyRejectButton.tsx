"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount } from "wagmi";

interface LobbyRejectButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: TransactionFollowUp;
  onError?: (error: Error) => void;
}

const LOBBY_REJECT_ABI = [
  {
    inputs: [{ internalType: "uint256", name: "_lobbyId", type: "uint256" }],
    name: "rejectGame",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyRejectButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyRejectButtonProps) {
  const { address } = useAccount();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    return true;
  }, [address]);

  return (
    <TransactionButton
      transactionId={`reject-game-${lobbyId}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_REJECT_ABI}
      functionName="rejectGame"
      args={[lobbyId]}
      className={className}
      disabled={disabled}
      loadingText="[REJECTING...]"
      errorText="[ERROR REJECTING]"
      onSuccess={onSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}

