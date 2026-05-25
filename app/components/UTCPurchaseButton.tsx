"use client";

import React from "react";
import { TransactionButton } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount } from "../hooks/useAccount";
import { getSelectedChainId } from "../config/networks";
import posthog from "posthog-js";

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

const UTC_PURCHASE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint256", name: "_tier", type: "uint256" },
    ],
    name: "purchaseUTCWithFlow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

export function UTCPurchaseButton({
  tier,
  flowCost,
  utcAmount,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  refetch,
}: UTCPurchaseButtonProps) {
  const { address } = useAccount();
  const activeChainId = getSelectedChainId();

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (true) { // balance check removed with wagmi
      return "Insufficient FLOW balance";
    }
    return true;
  }, [address]);

  const handleSuccess = React.useCallback(() => {
    posthog.capture("utc_purchased", { tier, utc_amount: utcAmount });
    // Call the provided onSuccess callback
    onSuccess?.();
    // Trigger refetch to update the UI state
    refetch?.();
  }, [onSuccess, refetch, tier, utcAmount]);

  return (
    <TransactionButton
      transactionId={`purchase-utc-tier-${tier}-${address}`}
      contractAddress={CONTRACT_ADDRESSES.SHIP_PURCHASER as `0x${string}`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi={UTC_PURCHASE_ABI as any}
      functionName="purchaseUTCWithFlow"
      args={[
        address,
        Number(tier), // Tier is 0-based (0-4), uint256 expects BigInt
      ]}
      value={flowCost}
      className={className}
      disabled={disabled}
      loadingText="[PURCHASING UTC...]"
      errorText="[ERROR PURCHASING]"
      onSuccess={handleSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
