"use client";

import React, { useState } from "react";
import { useLobbies } from "../hooks/useLobbies";
import posthog from "posthog-js";

interface LobbyAcceptButtonProps {
  lobbyId: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LobbyAcceptButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyAcceptButtonProps) {
  const { acceptGame } = useLobbies();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await acceptGame(lobbyId);
      posthog.capture("game_accepted", { lobby_id: lobbyId.toString() });
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
      {isPending ? "[ACCEPTING...]" : children}
    </button>
  );
}
