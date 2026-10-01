"use client";

import React from "react";
import { TransactionButton, type TransactionFollowUp } from "./TransactionButton";
import { CONTRACT_ADDRESSES } from "../config/contracts";
import { useAccount, useBalance } from "wagmi";
import { getSelectedChainId } from "../config/networks";
import posthog from "posthog-js";

interface UTCPurchaseButtonProps {
  tier: number;
  flowCost: bigint;
  utcAmount: string;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: TransactionFollowUp;
  onError?: (error: Error) => void;
  refetch?: () => void | Promise<unknown>;
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

  // Get user's FLOW balance
  const { data: flowBalance } = useBalance({
    address,
    chainId: activeChainId,
  });

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (!flowBalance || flowBalance.value < flowCost) {
      return "Insufficient FLOW balance";
    }
    return true;
  }, [address, flowBalance, flowCost]);

  const handleSuccess = React.useCallback(async () => {
    posthog.capture("utc_purchased", { tier, utc_amount: utcAmount });
    await refetch?.();
    await onSuccess?.();
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
        BigInt(tier), // Tier is 0-based (0-4), uint256 expects BigInt
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
