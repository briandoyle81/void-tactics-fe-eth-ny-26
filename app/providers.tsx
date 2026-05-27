"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "next-auth/react";
import { TransactionProvider } from "./providers/TransactionContext";
import { type ReactNode, useState } from "react";
import MobileAlphaNoticeModal from "./components/MobileAlphaNoticeModal";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <TransactionProvider>
          {children}
          <MobileAlphaNoticeModal />
        </TransactionProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}
