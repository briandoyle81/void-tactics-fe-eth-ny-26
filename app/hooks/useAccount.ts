"use client";

import { useCurrentUser } from "./useCurrentUser";

// Shim: matches the wagmi useAccount interface so components can be updated incrementally.
export function useAccount() {
  const { userId, isLoggedIn, isLoading } = useCurrentUser();

  type Status = "connected" | "disconnected" | "connecting" | "reconnecting";
  const status: Status = isLoading
    ? "connecting"
    : isLoggedIn
      ? "connected"
      : "disconnected";

  return {
    address: userId ?? undefined,
    isConnected: isLoggedIn,
    isDisconnected: !isLoggedIn && !isLoading,
    isLoading,
    status,
    chainId: undefined as number | undefined,
    connector: undefined,
  };
}
