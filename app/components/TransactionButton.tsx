"use client";

import React from "react";

// TransactionButton stub: blockchain writes removed in REST backend migration.
// Renders a disabled button so callers compile without wagmi/viem.
interface TransactionButtonProps {
  transactionId: string;
  contractAddress: string;
  abi: unknown[];
  functionName: string;
  args?: unknown[];
  value?: number;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  allowWhenOtherPending?: boolean;
  loadingText?: string;
  errorText?: string;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  onTransactionSent?: (hash: string) => void;
  onReceipt?: (receipt: { gasUsed: number }) => void;
  validateBeforeTransaction?: () => boolean | string;
  style?: React.CSSProperties;
}

export function TransactionButton({
  children,
  className = "",
  style,
}: TransactionButtonProps) {
  return (
    <button
      disabled
      type="button"
      className={className}
      style={{ ...style, opacity: 0.5, cursor: "not-allowed" }}
      title="Blockchain writes are not available in this version"
    >
      {children}
    </button>
  );
}
