"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider, createConfig, http } from "wagmi";
import { DynamicContextProvider } from "@dynamic-labs/sdk-react-core";
import { DynamicWagmiConnector } from "@dynamic-labs/wagmi-connector";
import { EthereumWalletConnectors } from "@dynamic-labs/ethereum";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useEffect, memo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";

const wagmiConfig = createConfig({
  chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
  multiInjectedProviderDiscovery: false,
  transports: {
    [flowTestnet.id]: http(),
    [saigon.id]: http(),
    [baseSepolia.id]: http(),
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

const DYNAMIC_SETTINGS = {
  environmentId: process.env.NEXT_PUBLIC_DYNAMIC_ENVIRONMENT_ID!,
  walletConnectors: [EthereumWalletConnectors],
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
    <DynamicContextProvider settings={DYNAMIC_SETTINGS}>
      <WagmiProvider config={wagmiConfig}>
        <QueryClientProvider client={queryClient}>
          <DynamicWagmiConnector>
            <AppContent>{children}</AppContent>
          </DynamicWagmiConnector>
        </QueryClientProvider>
      </WagmiProvider>
    </DynamicContextProvider>
  );
}
