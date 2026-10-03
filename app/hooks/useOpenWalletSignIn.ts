"use client";

import { useCallback } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";
import { useAccount } from "wagmi";

/**
 * Opens Dynamic's wallet sign-in. If Dynamic still has a session but no
 * wallet is connected (seen with MetaMask on Firefox: after a refresh the
 * extension's reconnect replies get lost, so wagmi never reconnects), opening
 * the auth flow is a silent no-op because Dynamic thinks you're signed in —
 * the user is stuck looking logged out. Clear that stale session first so the
 * sign-in flow actually opens.
 */
export function useOpenWalletSignIn() {
  const { user, setShowAuthFlow, handleLogOut } = useDynamicContext();
  const { isConnected } = useAccount();

  return useCallback(async () => {
    if (user && !isConnected) {
      try {
        await handleLogOut();
      } catch (error) {
        console.error("Failed to clear stale wallet session:", error);
      }
    }
    setShowAuthFlow(true);
  }, [user, isConnected, handleLogOut, setShowAuthFlow]);
}
