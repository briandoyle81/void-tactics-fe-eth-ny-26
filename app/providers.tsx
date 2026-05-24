"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { VOID_TACTICS_CHAIN_CHANGED_EVENT } from "./config/networks";
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

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <InvalidateQueriesOnChainChange />
        <PosthogAppChainSync />
        <TransactionProvider>
          {children}
          <MobileAlphaNoticeModal />
        </TransactionProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
