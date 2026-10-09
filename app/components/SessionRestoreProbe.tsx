"use client";

import { useEffect, useState } from "react";
import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

// Shared by /play and the Ops Console (/admin): after a page load, a wallet
// session takes a few seconds to come back. Screens that gate on "signed
// in" show a checking state meanwhile instead of a signed-out one.

/** How long to wait on a wallet session restore before showing the boot screen. */
const SESSION_RESTORE_TIMEOUT_MS = 5000;

/**
 * Whether the wallet SDK saved a connected wallet last visit. Read from its
 * persisted store because the SDK can take a while to report it has loaded
 * (or never does, if it can't reach its API), and a signed-out player
 * shouldn't wait on that.
 */
function hasSavedWalletSession(): boolean {
  try {
    const saved = JSON.parse(localStorage.getItem("dynamic_store") ?? "null");
    return (saved?.state?.connectedWalletsInfo?.length ?? 0) > 0;
  } catch {
    return false;
  }
}

/**
 * True while a signed-in wallet session is still coming back after a load
 * (see RestoreWalletConnection): the SDK has a user, or saved a wallet and
 * hasn't loaded yet, but wagmi isn't connected. Bounded so a locked wallet
 * doesn't hold the player on a loading screen.
 */
function useIsRestoringSession(isConnected: boolean): boolean {
  const { sdkHasLoaded, user } = useDynamicContext();
  const [hasSavedSession, setHasSavedSession] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useEffect(() => {
    setHasSavedSession(hasSavedWalletSession());
    const timer = setTimeout(() => setTimedOut(true), SESSION_RESTORE_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);
  if (timedOut || isConnected) return false;
  return Boolean(user) || (!sdkHasLoaded && hasSavedSession);
}

/**
 * Holds the wallet SDK context subscription (it updates often) in a leaf
 * that renders nothing, reporting only when the restore state flips, so the
 * whole client doesn't re-render on every SDK context change.
 */
export function SessionRestoreProbe({
  isConnected,
  onChange,
}: {
  isConnected: boolean;
  onChange: (isRestoring: boolean) => void;
}) {
  const isRestoring = useIsRestoringSession(isConnected);
  useEffect(() => {
    onChange(isRestoring);
  }, [isRestoring, onChange]);
  return null;
}
