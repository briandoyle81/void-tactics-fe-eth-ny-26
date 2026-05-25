"use client";

import React, { useState } from "react";
import { useLobbies } from "../hooks/useLobbies";
import posthog from "posthog-js";

interface LobbyCreateButtonProps {
  costLimit: number;
  turnTime: number;
  creatorGoesFirst: boolean;
  selectedMapId: number;
  maxScore: number;
  value?: number;
  reservedJoiner?: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onTransactionSent?: (hash: `0x${string}`) => void;
}

export function LobbyCreateButton({
  costLimit,
  turnTime,
  creatorGoesFirst,
  selectedMapId,
  maxScore,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyCreateButtonProps) {
  const { createLobby } = useLobbies();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await createLobby({
        costLimit,
        turnTimeSeconds: turnTime,
        creatorGoesFirst,
        selectedMapId,
        maxScore,
      });
      posthog.capture("lobby_created", {
        turn_time_seconds: turnTime,
        creator_goes_first: creatorGoesFirst,
        max_score: maxScore,
      });
      onSuccess?.();
    } catch (err) {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={disabled || isPending}
      className={className}
      type="button"
    >
      {isPending ? "[CREATING...]" : children}
    </button>
  );
}
