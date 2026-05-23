"use client";

import "@rainbow-me/rainbowkit/styles.css";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { RainbowKitProvider, getDefaultConfig } from "@rainbow-me/rainbowkit";
import { baseSepolia, flowTestnet, saigon } from "viem/chains";
import { http } from "wagmi";
import { SessionProvider } from "next-auth/react";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState, useMemo, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT, xaiTestnet } from "./config/networks";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";
import { PosthogAppChainSync } from "./components/PosthogAppChainSync";

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

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const walletConnectProjectId =
    process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID ||
    process.env.NEXT_PUBLIC_WALLETCONNECT_ID ||
    "YOUR_PROJECT_ID";

  const config = useMemo(
    () =>
      getDefaultConfig({
        appName: "WarpFlow",
        projectId: walletConnectProjectId,
        chains: [flowTestnet, saigon, baseSepolia, xaiTestnet],
        transports: {
          [flowTestnet.id]: http(),
          [saigon.id]: http(),
          [baseSepolia.id]: http(),
          [xaiTestnet.id]: http(),
        },
      }),
    [walletConnectProjectId]
  );

  return (
    <SessionProvider>
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <InvalidateQueriesOnChainChange />
          <PosthogAppChainSync />
          <RainbowKitProvider>
            <TransactionProvider>
              {children}
              <MobileAlphaNoticeModal />
            </TransactionProvider>
          </RainbowKitProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </SessionProvider>
  );
}
