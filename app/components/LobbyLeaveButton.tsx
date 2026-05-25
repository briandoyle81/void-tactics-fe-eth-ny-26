"use client";

import React, { useState } from "react";
import { useLobbies } from "../hooks/useLobbies";

interface LobbyLeaveButtonProps {
  lobbyId: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Unused — kept for call-site compat. */
  allowWhenOtherPending?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function LobbyLeaveButton({
  lobbyId,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: LobbyLeaveButtonProps) {
  const { leaveLobby } = useLobbies();
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    if (isPending) return;
    setIsPending(true);
    try {
      await leaveLobby(lobbyId);
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
      {isPending ? "[LEAVING...]" : children}
    </button>
  );
}
