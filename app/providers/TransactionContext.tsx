"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { toast } from "react-hot-toast";
import { useWaitForTransactionReceipt } from "wagmi";

interface TransactionState {
  isPending: boolean;
  error: Error | null;
  activeTransactionId: string | null;
  hash: `0x${string}` | null;
  startedAt: number | null;
}

interface TransactionContextType {
  transactionState: TransactionState;
  startTransaction: (transactionId: string) => void;
  setTransactionHash: (transactionId: string, hash: `0x${string}`) => void;
  completeTransaction: (
    transactionId: string,
    success: boolean,
    error?: Error
  ) => void;
  clearError: (transactionId: string) => void;
  clearAllTransactions: () => void;
}

const TransactionContext = createContext<TransactionContextType | undefined>(
  undefined
);

export function TransactionProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [transactionState, setTransactionState] = useState<TransactionState>({
    isPending: false,
    error: null,
    activeTransactionId: null,
    hash: null,
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
      hash: null,
      startedAt: Date.now(),
    });

    // Global fallback: if the originating button unmounts mid-tx, don't leave UI
    // permanently disabled. Receipt tracking below should usually clear this.
    fallbackTimeoutRef.current = setTimeout(() => {
      setTransactionState((prev) => {
        if (prev.activeTransactionId !== transactionId) return prev;
        return {
          isPending: false,
          error: null,
          activeTransactionId: null,
          hash: null,
          startedAt: null,
        };
      });
    }, 90_000);
  }, []);

  const setTransactionHash = useCallback(
    (transactionId: string, hash: `0x${string}`) => {
      setTransactionState((prev) => {
        if (prev.activeTransactionId !== transactionId) return prev;
        return { ...prev, hash };
      });
    },
    []
  );

  const { isError, error: receiptError } = useWaitForTransactionReceipt(
    {
      hash: transactionState.hash ?? undefined,
      query: {
        enabled: transactionState.isPending && !!transactionState.hash,
      },
    }
  );

  // Receipt success is NOT enough to clear pending. The originating button
  // still has follow-up work (refetch, wait for a new lobby to appear, etc.)
  // and calls completeTransaction when that work is done. Auto-clearing here
  // re-enabled Create/Join/etc. a beat before the list updated. Receipt
  // *failure* still clears, and the 90s fallback still covers an unmounted
  // button.
  useEffect(() => {
    if (!transactionState.isPending) return;
    if (!transactionState.activeTransactionId) return;
    if (!transactionState.hash) return;

    if (isError && receiptError) {
      if (fallbackTimeoutRef.current) {
        clearTimeout(fallbackTimeoutRef.current);
        fallbackTimeoutRef.current = null;
      }
      setTransactionState({
        isPending: false,
        error: receiptError as Error,
        activeTransactionId: null,
        hash: null,
        startedAt: null,
      });
    }
  }, [
    isError,
    receiptError,
    transactionState.isPending,
    transactionState.activeTransactionId,
    transactionState.hash,
  ]);

  const completeTransaction = useCallback(
    (transactionId: string, success: boolean, error?: Error) => {
      setTransactionState((prev) => {
        // Only update if this is the active transaction
        if (prev.activeTransactionId !== transactionId) {
          return prev;
        }

        if (fallbackTimeoutRef.current) {
          clearTimeout(fallbackTimeoutRef.current);
          fallbackTimeoutRef.current = null;
        }

        if (success) {
          return {
            isPending: false,
            error: null,
            activeTransactionId: null,
            hash: null,
            startedAt: null,
          };
        } else {
          const errorMessage = error?.message || "Transaction failed";

          // Check if the error is due to user rejection
          if (
            errorMessage.includes("User rejected") ||
            errorMessage.includes("User denied") ||
            errorMessage.includes("rejected")
          ) {
            toast.error("Transaction declined by user");
          } else {
            toast.error(`Transaction failed: ${errorMessage}`);
          }

          return {
            isPending: false,
            error: error || null,
            activeTransactionId: null,
            hash: null,
            startedAt: null,
          };
        }
      });
    },
    []
  );

  const clearError = useCallback((transactionId: string) => {
    setTransactionState((prev) => {
      if (prev.activeTransactionId === transactionId) {
        return {
          ...prev,
          error: null,
        };
      }
      return prev;
    });
  }, []);

  const clearAllTransactions = useCallback(() => {
    if (fallbackTimeoutRef.current) {
      clearTimeout(fallbackTimeoutRef.current);
      fallbackTimeoutRef.current = null;
    }
    setTransactionState({
      isPending: false,
      error: null,
      activeTransactionId: null,
      hash: null,
      startedAt: null,
    });
  }, []);

  const value = React.useMemo(
    () => ({
      transactionState,
      startTransaction,
      setTransactionHash,
      completeTransaction,
      clearError,
      clearAllTransactions,
    }),
    [
      transactionState,
      startTransaction,
      setTransactionHash,
      completeTransaction,
      clearError,
      clearAllTransactions,
    ],
  );

  return (
    <TransactionContext.Provider value={value}>
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
