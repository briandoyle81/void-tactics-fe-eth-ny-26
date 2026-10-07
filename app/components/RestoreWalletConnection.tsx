"use client";

import { useEffect, useRef } from "react";
import { useDynamicContext, useUserWallets } from "@dynamic-labs/sdk-react-core";
import { ConnectorAlreadyConnectedError, useAccount, useConfig } from "wagmi";
import { connect, getAccount, getConnectors } from "wagmi/actions";

const RETRY_DELAYS_MS = [0, 500, 1000, 2000, 4000];
// MetaMask on Firefox can drop replies after a reload ("StreamMiddleware -
// Unknown response id"), leaving a request pending forever — so each attempt
// gives up after this long and the next retry goes ahead.
const ATTEMPT_TIMEOUT_MS = 3000;

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)),
  ]);
}

/**
 * Reconnects wagmi to an extension wallet (e.g. MetaMask) after a page
 * refresh.
 *
 * After a refresh Dynamic restores the session and primaryWallet, and
 * DynamicWagmiConnector's SyncDynamicWagmi calls wagmi's connect() once. That
 * connect asks the wallet for its chain (eth_chainId); with MetaMask on
 * Firefox the reply can be dropped right after a reload ("StreamMiddleware -
 * Unknown response id"), so the connect fails — and SyncDynamicWagmi never
 * retries the same wallet. Dynamic stays signed in, wagmi stays
 * disconnected, and the app (which keys "signed in" off wagmi) shows the
 * player as logged out.
 *
 * Once Dynamic has loaded with a user and wallet but wagmi isn't connected,
 * this checks (silently, via eth_accounts) that the site is still authorized,
 * then connects wagmi itself with the connector Dynamic registered, retrying
 * with timeouts. That connect never prompts — it reads the address Dynamic
 * already has plus the chain. If the site isn't authorized, nothing happens
 * and the Connect button signs in again (useOpenWalletSignIn). Runs once per
 * page load.
 */
export function RestoreWalletConnection() {
  const { user, primaryWallet, sdkHasLoaded } = useDynamicContext();
  const userWallets = useUserWallets();
  const { isConnected, status } = useAccount();
  const wagmiConfig = useConfig();
  const attemptedRef = useRef(false);
  // Cancel only on unmount — not when status/wallet change mid-attempt
  // (the reconnect itself flips wagmi's status), which would otherwise stop
  // the retries for good since attemptedRef keeps it to one run.
  const unmountedRef = useRef(false);
  useEffect(() => {
    unmountedRef.current = false;
    return () => {
      unmountedRef.current = true;
    };
  }, []);

  const wallet = primaryWallet ?? userWallets[0] ?? null;

  useEffect(() => {
    if (attemptedRef.current) return;
    if (!sdkHasLoaded || !user || !wallet) return;
    if (isConnected || status === "connecting" || status === "reconnecting") return;
    attemptedRef.current = true;

    void (async () => {
      for (const delay of RETRY_DELAYS_MS) {
        if (delay) await new Promise((resolve) => setTimeout(resolve, delay));
        if (unmountedRef.current) return;
        try {
          const accounts = await withTimeout(
            wallet.connector.getConnectedAccounts(),
            ATTEMPT_TIMEOUT_MS,
            "getConnectedAccounts",
          );
          if (accounts.length === 0) continue; // extension not ready yet, or site no longer authorized
          if (getAccount(wagmiConfig).isConnected) return;
          // DynamicWagmiConnector registers exactly one connector for the
          // primary wallet (id "dynamic-<walletKey>-<n>").
          const connector = getConnectors(wagmiConfig).find((c) => c.id.startsWith("dynamic-"));
          if (!connector) continue; // not registered yet
          await withTimeout(connect(wagmiConfig, { connector }), ATTEMPT_TIMEOUT_MS * 2, "wagmi connect");
          return;
        } catch (error) {
          if (error instanceof ConnectorAlreadyConnectedError || getAccount(wagmiConfig).isConnected) return;
          // Otherwise a dropped reply or timeout; the next retry tries again.
        }
      }
    })();
  }, [sdkHasLoaded, user, wallet, isConnected, status, wagmiConfig]);

  return null;
}
