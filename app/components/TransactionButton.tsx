"use client";

import React from "react";
import { useWriteContract, useWaitForTransactionReceipt, usePublicClient } from "wagmi";
import type { Abi } from "viem";
import { toast } from "react-hot-toast";
import { useTransaction } from "../providers/TransactionContext";
import { useSelectedChainId } from "../hooks/useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "../hooks/useSwitchToSelectedChainIfNeeded";
import {
  bumpedLegacyGasPriceForRetry,
  getLegacyGasPriceOverridesForWrite,
} from "../utils/legacyGasPriceForWrite";

interface TransactionButtonProps {
  // Transaction identification
  transactionId: string;

  // Contract call configuration
  contractAddress: `0x${string}`;
  abi: Abi;
  functionName: string;
  args?: unknown[];
  value?: bigint;

  // Button appearance
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** When true, button stays enabled when another transaction is pending (only this button's own pending state disables it). */
  allowWhenOtherPending?: boolean;
  loadingText?: string;
  errorText?: string;

  // Callbacks
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onTransactionSent?: (hash: `0x${string}`) => void; // Called when transaction is sent (hash available)
  onReceipt?: (receipt: { gasUsed: bigint }) => void; // Called when transaction receipt is received

  // Validation
  validateBeforeTransaction?: () => boolean | string; // Return true or error message

  /** Merged with defaults (e.g. square corners). Use for theme borders on the underlying button. */
  style?: React.CSSProperties;
}

export function TransactionButton({
  transactionId,
  contractAddress,
  abi,
  functionName,
  args = [],
  value,
  children,
  className = "",
  disabled = false,
  allowWhenOtherPending = false,
  loadingText = "[PROCESSING...]",
  errorText = "[ERR]",
  onSuccess,
  onError,
  onTransactionSent,
  onReceipt,
  validateBeforeTransaction,
  style: buttonStyle,
}: TransactionButtonProps) {
  const selectedChainId = useSelectedChainId();
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const publicClient = usePublicClient({ chainId: selectedChainId });
  const { writeContract, isPending, error, data: hash } = useWriteContract();
  const {
    transactionState,
    startTransaction,
    setTransactionHash,
    completeTransaction,
    clearError,
  } = useTransaction();

  // Hydration safety - prevent mismatch between server and client
  const [isHydrated, setIsHydrated] = React.useState(false);
  React.useEffect(() => {
    setIsHydrated(true);
  }, []);

  // Check if this button is the active transaction
  const isActiveTransaction =
    transactionState.activeTransactionId === transactionId;

  // Local state to track if we should consider the transaction as pending
  const [isLocallyPending, setIsLocallyPending] = React.useState(false);

  // Track if we've already called onTransactionSent for this hash
  const transactionSentHashRef = React.useRef<`0x${string}` | null>(null);
  // Track hashes we've already processed for completion callbacks
  const completedHashRef = React.useRef<`0x${string}` | null>(null);

  // Wait for transaction receipt
  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
    data: receipt,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: selectedChainId,
    query: {
      enabled:
        !!hash &&
        isHydrated &&
        (isActiveTransaction ||
          isLocallyPending ||
          transactionSentHashRef.current === hash), // Keep receipt tracking alive for this button's tx even if global active ID is cleared early
    },
  });

  // Fallback timeout for transaction completion
  const [fallbackTimeout, setFallbackTimeout] =
    React.useState<NodeJS.Timeout | null>(null);

  React.useEffect(() => {
    if (
      isActiveTransaction &&
      hash &&
      !isConfirmed &&
      !isConfirming &&
      !error &&
      !receiptError
    ) {
      // Set a fallback timeout if transaction seems stuck
      const timeout = setTimeout(() => {
        completeTransaction(transactionId, true);
        onSuccess?.();
      }, 30000); // 30 second fallback

      setFallbackTimeout(timeout);

      return () => {
        if (timeout) {
          clearTimeout(timeout);
        }
      };
    } else if (fallbackTimeout) {
      clearTimeout(fallbackTimeout);
      setFallbackTimeout(null);
    }
  }, [
    isActiveTransaction,
    hash,
    isConfirmed,
    isConfirming,
    error,
    receiptError,
    transactionId,
    completeTransaction,
    onSuccess,
    fallbackTimeout,
  ]);
  const isTransactionPending =
    (transactionState.isPending && isActiveTransaction) ||
    (isHydrated && isConfirming && isActiveTransaction) ||
    isLocallyPending;
  const hasTransactionError = transactionState.error && isActiveTransaction;

  const messageFromUnknownError = React.useCallback((err: unknown): string => {
    if (err instanceof Error) return err.message;
    if (
      typeof err === "object" &&
      err !== null &&
      "message" in err &&
      typeof (err as { message: unknown }).message === "string"
    ) {
      return (err as { message: string }).message;
    }
    return String(err);
  }, []);

  const isTransactionUnderpricedError = React.useCallback(
    (err: unknown): boolean => {
      let current: unknown = err;
      for (let i = 0; i < 8 && current != null; i++) {
        const msg = messageFromUnknownError(current).toLowerCase();
        if (msg.includes("transaction underpriced")) return true;
        if (typeof current === "object" && current !== null && "cause" in current) {
          current = (current as { cause: unknown }).cause;
        } else {
          break;
        }
      }
      return false;
    },
    [messageFromUnknownError],
  );

  // Handle transaction execution
  const handleTransaction = async () => {
    try {
      // Validate before transaction if validator provided
      if (validateBeforeTransaction) {
        const validation = validateBeforeTransaction();
        if (validation !== true) {
          toast.error(validation as string);
          return;
        }
      }

      await switchToSelectedChainIfNeeded();

      // Start transaction tracking
      startTransaction(transactionId);
      setIsLocallyPending(true); // Set local pending state

      // Execute the contract call
      const writePayload = {
        address: contractAddress,
        abi,
        functionName,
        args,
        value,
        chainId: selectedChainId,
      } as const;

      try {
        await writeContract({
          ...writePayload,
          ...(await getLegacyGasPriceOverridesForWrite(
            selectedChainId,
            publicClient,
          )),
        });
      } catch (writeErr) {
        if (!isTransactionUnderpricedError(writeErr) || !publicClient) {
          throw writeErr;
        }

        // Some RPCs reject wallet-estimated fees with "transaction underpriced".
        // Retry once with explicit legacy gasPrice above network quote.
        const baseGasPrice = await publicClient.getGasPrice();
        const bumpedGasPrice = bumpedLegacyGasPriceForRetry(
          selectedChainId,
          baseGasPrice,
        );
        await writeContract({
          ...writePayload,
          gasPrice: bumpedGasPrice,
        });
      }

      // Note: The hash will be available in the hash variable from useWriteContract
      // We'll trigger onTransactionSent in a useEffect when hash becomes available
    } catch (err: unknown) {
      const detail = messageFromUnknownError(err);
      const normalized = isTransactionUnderpricedError(err)
        ? `${detail}\n\nHint: wallet/RPC nonce state may be stuck. Try clearing wallet activity/nonce state, then retry.`
        : detail;
      const error = new Error(normalized);
      setIsLocallyPending(false); // Reset local pending state on error
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  };

  // Handle transaction completion based on receipt confirmation
  React.useEffect(() => {
    const isOwnSentHash =
      !!hash && transactionSentHashRef.current === hash;
    const canHandleSuccess = isHydrated && (isActiveTransaction || isOwnSentHash);

    if (canHandleSuccess && isConfirmed && receipt && hash) {
      // Prevent duplicate handling for the same tx hash.
      if (completedHashRef.current === hash) return;
      completedHashRef.current = hash;
      setIsLocallyPending(false); // Reset local pending state

      // `isConfirmed` (useWaitForTransactionReceipt's isSuccess) only means
      // a receipt was fetched — it stays true even when the transaction
      // itself reverted on-chain (status: "reverted"), since viem doesn't
      // throw for that case. Without this check, every reverted write
      // (wrong turn, invalid move, etc.) across the app was silently
      // treated as a success: onSuccess fired, onError never did, and
      // callers that record optimistic state on success (e.g. the move
      // confirm widget) were left showing a move that never happened until
      // something unrelated eventually reconciled the UI.
      if (receipt.status === "reverted") {
        const revertError = new Error(
          "Transaction reverted on-chain",
        );
        completeTransaction(transactionId, false, revertError);
        onError?.(revertError);
        return;
      }

      // Call onReceipt callback with gas information
      if (onReceipt && receipt.gasUsed) {
        onReceipt({ gasUsed: receipt.gasUsed });
      }
      completeTransaction(transactionId, true);
      onSuccess?.();
    } else if (isActiveTransaction && isHydrated && receiptError) {
      // Transaction failed during confirmation
      setIsLocallyPending(false); // Reset local pending state
      completeTransaction(transactionId, false, receiptError);
      onError?.(receiptError);
    } else if (isActiveTransaction && !isPending && error) {
      // Transaction failed during submission
      setIsLocallyPending(false); // Reset local pending state
      completeTransaction(transactionId, false, error);
      onError?.(error);
    }
  }, [
    isActiveTransaction,
    isHydrated,
    isConfirmed,
    isPending,
    error,
    receiptError,
    receipt,
    hash,
    transactionId,
    completeTransaction,
    onSuccess,
    onError,
    onReceipt,
  ]);

  // Clear error when component unmounts or transaction changes
  React.useEffect(() => {
    return () => {
      if (isActiveTransaction) {
        clearError(transactionId);
      }
    };
  }, [isActiveTransaction, transactionId, clearError]);

  // Reset transaction state when transaction ID changes
  React.useEffect(() => {
    // Clear any stale transaction state when the transaction ID changes
    if (transactionState.activeTransactionId !== transactionId) {
      clearError(transactionId);
      setIsLocallyPending(false); // Reset local pending state
    }
  }, [transactionId, transactionState.activeTransactionId, clearError]);

  // Reset local pending state when all transactions are cleared (activeTransactionId becomes null)
  // This ensures the button is re-enabled after clearAllTransactions() is called
  React.useEffect(() => {
    if (!transactionState.activeTransactionId && !transactionState.isPending) {
      setIsLocallyPending(false);
    }
  }, [transactionState.activeTransactionId, transactionState.isPending]);

  // Trigger onTransactionSent when hash becomes available (transaction sent, before receipt)
  React.useEffect(() => {
    if (
      hash &&
      (isActiveTransaction || isLocallyPending) &&
      onTransactionSent &&
      !isConfirmed &&
      !isConfirming &&
      transactionSentHashRef.current !== hash
    ) {
      // Hash is available - transaction was sent by wallet, but receipt not yet confirmed
      transactionSentHashRef.current = hash;
      setTransactionHash(transactionId, hash);
      onTransactionSent(hash);
    }
  }, [
    hash,
    isActiveTransaction,
    isLocallyPending,
    onTransactionSent,
    isConfirmed,
    isConfirming,
    setTransactionHash,
    transactionId,
  ]);

  // Reset the ref when transaction changes
  React.useEffect(() => {
    if (!isActiveTransaction) {
      transactionSentHashRef.current = null;
      completedHashRef.current = null;
    }
  }, [isActiveTransaction]);

  // Determine button state
  const isDisabled =
    disabled ||
    isTransactionPending ||
    (!allowWhenOtherPending &&
      transactionState.isPending &&
      !isActiveTransaction);

  let buttonContent = children;
  if (isTransactionPending) {
    buttonContent = loadingText;
  } else if (hasTransactionError) {
    buttonContent = errorText;
  }

  // Remove rounded classes from className to enforce square corners
  const cleanedClassName = className
    .replace(/\brounded(-\w+)?\b/g, "")
    .replace(/\s+/g, " ") // Replace multiple spaces with single space
    .trim();

  return (
    <button
      onClick={handleTransaction}
      disabled={isDisabled}
      className={`${cleanedClassName} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{
        ...(buttonStyle ?? {}),
        borderRadius: 0, // Force square corners for industrial theme
      }}
    >
      {buttonContent}
    </button>
  );
}
