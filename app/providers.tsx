"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { DynamicContextProvider, type DynamicContextProps } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { SessionProvider } from "next-auth/react";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useEffect, memo } from "react";
import { ContractEventsHost } from "./hooks/useContractEvents";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";
import { RestoreWalletConnection } from "./components/RestoreWalletConnection";
import { useRankConfigSync } from "./hooks/useRankConfigSync";
import { useRankConfigSyncWeb2 } from "./hooks/useRankConfigSyncWeb2";
import { recordRpcRequest } from "./utils/rpcUsage";

// Base Sepolia RPC for reads (wagmi) and wallet writes (Dynamic). Set
// NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL to a keyed provider (e.g. Ankr): the
// public sepolia.base.org endpoint rate-limits (403s) under heavy AI-turn
// polling. As a client-side URL the key is visible to the browser either
// way — the env var just keeps it out of source and easy to rotate (the
// previously hardcoded Ankr key was disabled on 2026-10-08, which broke
// every Base Sepolia read).
const PUBLIC_BASE_SEPOLIA_RPC_URL = "https://sepolia.base.org";
const CONFIGURED_BASE_SEPOLIA_RPC_URL = process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_URL?.trim() || null;
const BASE_SEPOLIA_RPC_URL = CONFIGURED_BASE_SEPOLIA_RPC_URL ?? PUBLIC_BASE_SEPOLIA_RPC_URL;

const wagmiConfig = createConfig({
  chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [flowTestnet.id]: http(),
    [saigon.id]: http(),
    // onFetchRequest counts requests by method (app/utils/rpcUsage.ts).
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL, { onFetchRequest: recordRpcRequest }),
    [xaiTestnet.id]: http(),
  },
});

// Keeps rankConfigCache.ts warm from both modes' live sources (see
// useRankConfigSync.ts / useRankConfigSyncWeb2.ts) — mounted once here
// rather than per ship-display component, since neither hook's data
// depends on which page is currently open.
function RankConfigSync() {
  useRankConfigSync();
  useRankConfigSyncWeb2();
  return null;
}

function InvalidateQueriesOnChainChange() {
  const queryClient = useQueryClient();
  useEffect(() => {
    const handler = () => {
      void queryClient.invalidateQueries();
    };
    window.addEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, handler);
    return () => {
      window.removeEventListener(VOID_TACTICS_CHAIN_CHANGED_EVENT, handler);
    };
  }, [queryClient]);
  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
  },
});

const DYNAMIC_SETTINGS: DynamicContextProps["settings"] = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
  walletConnectors: [EthereumWalletConnectors],
  // wagmiConfig's `transports` above only governs the wagmi public client
  // (reads via usePublicClient/useReadContract) — writes sent through a
  // Dynamic-connected wallet (DynamicWagmiConnector) resolve their own RPC
  // from Dynamic's own network config, entirely separate from wagmi's. That
  // still defaulted to the public sepolia.base.org even after the wagmi
  // transport was switched to Ankr, so takeAITurn/acceptMatch/etc. kept
  // hitting the rate-limited public endpoint. Override just Base Sepolia's
  // RPC here too, leaving every other dashboard-configured network as-is.
  // Only when a keyed RPC is configured; otherwise Dynamic keeps its own.
  overrides: CONFIGURED_BASE_SEPOLIA_RPC_URL
    ? {
        evmNetworks: (networks) =>
          networks.map((network) =>
            Number(network.chainId) === baseSepolia.id
              ? {
                  ...network,
                  rpcUrls: [CONFIGURED_BASE_SEPOLIA_RPC_URL],
                  privateCustomerRpcUrls: [CONFIGURED_BASE_SEPOLIA_RPC_URL],
                }
              : network,
          ),
      }
    : undefined,
};

// memo prevents DynamicWagmiConnectorInner's frequent re-renders from cascading into the entire app tree
const AppContent = memo(function AppContent({ children }: { children: ReactNode }) {
  return (
    <>
      <InvalidateQueriesOnChainChange />
      <RankConfigSync />
      <ContractEventsHost />
      <PosthogAppChainSync />
      <RestoreWalletConnection />
      <TransactionProvider>
        {children}
        <MobileAlphaNoticeModal />
      </TransactionProvider>
    </>
  );
});

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      <DynamicContextProvider settings={DYNAMIC_SETTINGS}>
        <WagmiProvider config={wagmiConfig}>
          <QueryClientProvider client={queryClient}>
            <DynamicWagmiConnector>
              <AppContent>{children}</AppContent>
            </DynamicWagmiConnector>
          </QueryClientProvider>
        </WagmiProvider>
      </DynamicContextProvider>
    </SessionProvider>
  );
}
