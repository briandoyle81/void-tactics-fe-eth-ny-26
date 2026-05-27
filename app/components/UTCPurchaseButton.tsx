"use client";

import React from "react";

interface UTCPurchaseButtonProps {
  tier: number;
  flowCost: number;
  utcAmount: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  refetch?: () => void;
}

// Stub: blockchain UTC purchasing removed in REST backend migration.
export function UTCPurchaseButton({
  children,
  className = "",
  disabled = false,
}: UTCPurchaseButtonProps) {
  return (
    <button
      disabled={disabled || true}
      type="button"
      className={className}
      style={{ opacity: 0.5, cursor: "not-allowed" }}
      title="Blockchain purchases are not available in this version"
    >
      {children}
    </button>
  );
}
