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
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";

// TEMPORARY: hardcoded Ankr key to get off the public sepolia.base.org RPC,
// which was rate-limiting us (403s) under normal AI-turn polling load. Move
// to an env var once whitelisting is set up — note that as a client-side
// (browser) request, this URL/key is visible to the client either way
// unless it's routed through a server-side proxy; an env var alone doesn't
// hide it here, it's just cleaner to rotate/manage.
const BASE_SEPOLIA_RPC_URL =
  "https://rpc.ankr.com/base_sepolia/31ef0b305970259dd64f01bf48c77e9593ce3c493320f5879d6c9b9430f7fb68";

const wagmiConfig = createConfig({
  chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [flowTestnet.id]: http(),
    [saigon.id]: http(),
    [baseSepolia.id]: http(BASE_SEPOLIA_RPC_URL),
    [xaiTestnet.id]: http(),
  },
});

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

const queryClient = new QueryClient();

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
  overrides: {
    evmNetworks: (networks) =>
      networks.map((network) =>
        Number(network.chainId) === baseSepolia.id
          ? {
              ...network,
              rpcUrls: [BASE_SEPOLIA_RPC_URL],
              privateCustomerRpcUrls: [BASE_SEPOLIA_RPC_URL],
            }
          : network,
      ),
  },
};

// memo prevents DynamicWagmiConnectorInner's frequent re-renders from cascading into the entire app tree
const AppContent = memo(function AppContent({ children }: { children: ReactNode }) {
  return (
    <>
      <InvalidateQueriesOnChainChange />
      <PosthogAppChainSync />
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
