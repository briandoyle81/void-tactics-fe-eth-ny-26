"use client";

import React, { useState } from "react";
import { useLobbies } from "../hooks/useLobbies";
import posthog from "posthog-js";

interface LobbyJoinButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LobbyJoinButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyJoinButtonProps) {
  const { joinLobby } = useLobbies();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await joinLobby(lobbyId);
      posthog.capture("lobby_joined", { lobby_id: lobbyId.toString() });
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
      {isPending ? "[JOINING...]" : children}
    </button>
  );
}
