"use client";

import React, { useState } from "react";
import { useLobbies } from "../hooks/useLobbies";

interface LobbyRejectButtonProps {
  lobbyId: bigint;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LobbyRejectButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyRejectButtonProps) {
  const { rejectGame } = useLobbies();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await rejectGame(lobbyId);
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
      {isPending ? "[REJECTING...]" : children}
    </button>
  );
}
