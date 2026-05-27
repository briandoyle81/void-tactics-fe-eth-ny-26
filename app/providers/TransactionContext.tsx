"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import { toast } from "react-hot-toast";

interface TransactionState {
  isPending: boolean;
  error: Error | null;
  activeTransactionId: string | null;
  startedAt: number | null;
}

interface TransactionContextType {
  transactionState: TransactionState;
  startTransaction: (transactionId: string) => void;
  // Kept for backward-compat with TransactionButton (wagmi path) — no-op in REST path
  setTransactionHash: (transactionId: string, hash: string) => void;
  completeTransaction: (transactionId: string, success: boolean, error?: Error) => void;
  clearError: (transactionId: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(undefined);

export function TransactionProvider({ children }: { children: React.ReactNode }) {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isPending: false,
    error: null,
    activeTransactionId: null,
    startedAt: null,
  });

  const fallbackTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTransaction = useCallback((transactionId: string) => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setTransactionState({
      isPending: true,
      error: null,
      activeTransactionId: transactionId,
      startedAt: Date.now(),
    });
    fallbackTimeoutRef.current = setTimeout(() => {
      setTransactionState((prev) => {
        if (prev.activeTransactionId !== transactionId) return prev;
        return { isPending: false, error: null, activeTransactionId: null, startedAt: null };
      });
    }, 90_000);
  }, []);

  // No-op for REST path; TransactionButton (wagmi) still calls this
  const setTransactionHash = useCallback(
    (_transactionId: string, _hash: string) => {},
    [],
  );

  const completeTransaction = useCallback(
    (transactionId: string, success: boolean, error?: Error) => {
      setTransactionState((prev) => {
        if (prev.activeTransactionId !== transactionId) return prev;
        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }
        if (success) {
          return { isPending: false, error: null, activeTransactionId: null, startedAt: null };
        }
        const errorMessage = error?.message || "Transaction failed";
        if (
          errorMessage.includes("User rejected") ||
          errorMessage.includes("User denied") ||
          errorMessage.includes("rejected")
        ) {
          toast.error("Transaction declined by user");
        } else {
          toast.error(`Transaction failed: ${errorMessage}`);
        }
        return { isPending: false, error: error || null, activeTransactionId: null, startedAt: null };
      });
    },
    [],
  );

  const clearError = useCallback((transactionId: string) => {
    setTransactionState((prev) => {
      if (prev.activeTransactionId === transactionId) return { ...prev, error: null };
      return prev;
    });
  }, []);

  const clearAllTransactions = useCallback(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setTransactionState({ isPending: false, error: null, activeTransactionId: null, startedAt: null });
  }, []);

  return (
    <TransactionContext.Provider
      value={{ transactionState, startTransaction, setTransactionHash, completeTransaction, clearError, clearAllTransactions }}
    >
      {children}
    </TransactionContext.Provider>
  );
}

export function useTransaction() {
  const context = useContext(TransactionContext);
  if (context === undefined) {
    throw new Error("useTransaction must be used within a TransactionProvider");
  }
  return context;
}
