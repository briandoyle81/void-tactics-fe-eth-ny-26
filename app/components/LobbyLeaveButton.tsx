"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";

interface LobbyLeaveButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** When true, button stays enabled when another transaction is pending (e.g. Create Fleet). */
  allowWhenOtherPending?: boolean;
  onSuccess?: TransactionFollowUp;
  onError?: (error: Error) => void;
}

const LOBBY_LEAVE_ABI = [
  {
    inputs: [
      {
        internalType: "uint256",
        name: "_lobbyId",
        type: "uint256",
      },
    ],
    name: "leaveLobby",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function LobbyLeaveButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  allowWhenOtherPending = false,
  onSuccess,
  onError,
}: LobbyLeaveButtonProps) {
  return (
    <TransactionButton
      transactionId={`leave-lobby-${lobbyId}`}
      contractAddress={CONTRACT_ADDRESSES.LOBBIES as `0x${string}`}
      abi={LOBBY_LEAVE_ABI}
      functionName="leaveLobby"
      args={[lobbyId]}
      className={className}
      disabled={disabled}
      allowWhenOtherPending={allowWhenOtherPending}
      onSuccess={onSuccess}
      onError={onError}
    >
      {children}
    </TransactionButton>
  );
}
