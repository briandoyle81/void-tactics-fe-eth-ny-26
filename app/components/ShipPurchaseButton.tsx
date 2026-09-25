"use client";

import React, { useState, useEffect } from "react";
import { TransactionButton } from "./TransactionButton";
import {
  CONTRACT_ABIS,
  getContractAddresses,
} from "../config/contracts";
import { useAccount, useBalance, useReadContract, usePublicClient } from "wagmi";
import type { Abi } from "viem";
import { formatEther } from "viem";
import { toast } from "react-hot-toast";
import { getSelectedChainId, getVariantForChainId } from "../config/networks";
import posthog from "posthog-js";

interface ShipPurchaseButtonProps {
  tier: number;
  price: bigint;
  paymentMethod: "FLOW" | "UTC";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  refetch?: () => void;
  /** Faction/variant to mint. Defaults to the chain's configured variant when
   * omitted. Variant 2 is gated on the Shattered Hive medal — the caller
   * (VariantPicker) prevents selecting it without the NFT, and the contract
   * reverts GateRequirementNotMet as a backstop. */
  variant?: number;
}

const SHIP_PURCHASE_FLOW_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
      { internalType: "address", name: "_referral", type: "address" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
    ],
    name: "purchaseWithFlow",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
] as const;

const SHIP_PURCHASE_UTC_ABI = [
  {
    inputs: [
      { internalType: "address", name: "_to", type: "address" },
      { internalType: "uint8", name: "_tier", type: "uint8" },
      { internalType: "address", name: "_referral", type: "address" },
      { internalType: "uint16", name: "_variant", type: "uint16" },
    ],
    name: "purchaseWithUC",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

const UTC_APPROVE_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

export function ShipPurchaseButton({
  tier,
  price,
  paymentMethod,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  refetch,
  variant,
}: ShipPurchaseButtonProps) {
  const { address, chainId: walletChainId } = useAccount();
  const activeChainId = walletChainId ?? getSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);
  const purchaseVariant = variant ?? getVariantForChainId(activeChainId);
  const { data: flowBalance } = useBalance({
    address,
    chainId: activeChainId,
  });

  // Read UTC balance for UTC purchases
  const {
    data: utcBalance,
    isPending: utcBalancePending,
  } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: paymentMethod === "UTC" && !!address },
  });

  // Read UTC allowance for ShipPurchaser contract
  const { data: utcAllowance, refetch: refetchAllowance } = useReadContract({
    address: contractAddresses.UNIVERSAL_CREDITS as `0x${string}`,
    abi: CONTRACT_ABIS.UNIVERSAL_CREDITS as Abi,
    functionName: "allowance",
    args: address && contractAddresses.SHIP_PURCHASER ? [address, contractAddresses.SHIP_PURCHASER] : undefined,
    query: { enabled: paymentMethod === "UTC" },
  });

  const [utcApproved, setUtcApproved] = useState(false);
  const referralAddress = "0xac5b774D7a700AcDb528048B6052bc1549cd73B9" as `0x${string}`;

  // Check if UTC is approved
  useEffect(() => {
    if (paymentMethod === "UTC") {
      if (utcAllowance !== undefined && price) {
        setUtcApproved((utcAllowance as bigint) >= price);
      } else {
        // If allowance is not yet loaded, assume not approved
        setUtcApproved(false);
      }
    } else {
      // No approval needed for FLOW
      setUtcApproved(true);
    }
  }, [paymentMethod, utcAllowance, price]);

  const publicClient = usePublicClient({ chainId: activeChainId });

  // Estimate gas for tier 4 purchases before transaction
  useEffect(() => {
    if (tier === 4 && address && publicClient) {
      const estimateGas = async () => {
        try {
          let estimatedGas: bigint | undefined;
          if (paymentMethod === "FLOW") {
            estimatedGas = await publicClient.estimateContractGas({
              address: contractAddresses.SHIPS as `0x${string}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              abi: SHIP_PURCHASE_FLOW_ABI as any,
              functionName: "purchaseWithFlow",
              args: [address, tier, referralAddress, purchaseVariant],
              value: price,
              account: address,
            });
          } else if (utcApproved) {
            estimatedGas = await publicClient.estimateContractGas({
              address: contractAddresses.SHIP_PURCHASER as `0x${string}`,
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              abi: SHIP_PURCHASE_UTC_ABI as any,
              functionName: "purchaseWithUC",
              args: [address, tier, referralAddress, purchaseVariant],
              account: address,
            });
          }

          if (estimatedGas && estimatedGas > 15_000_000n) {
            toast.error(
              `High gas usage detected: ${estimatedGas.toLocaleString()} gas estimated for tier 4 purchase. This may indicate a contract issue.`,
              { duration: 10000 }
            );
          }
        } catch (error) {
          // If gas estimation fails, log but don't block
          console.warn("Failed to estimate gas for tier 4 purchase:", error);
        }
      };

      estimateGas();
    }
  }, [tier, address, paymentMethod, utcApproved, publicClient, referralAddress, purchaseVariant, price, contractAddresses.SHIPS, contractAddresses.SHIP_PURCHASER]);

  const validateBeforeTransaction = React.useCallback(() => {
    if (!address) {
      return "Please connect your wallet";
    }
    if (paymentMethod === "FLOW") {
      if (!flowBalance || flowBalance.value < price) {
        return "Insufficient FLOW balance";
      }
    } else {
      if (utcBalancePending) {
        return "Loading UTC balance...";
      }
      if (utcBalance === undefined || (utcBalance as bigint) < price) {
        return "Insufficient UTC balance";
      }
      if (!utcApproved) {
        return "Please approve UTC transfer first";
      }
    }
    return true;
  }, [
    address,
    flowBalance,
    utcBalance,
    utcBalancePending,
    utcApproved,
    price,
    paymentMethod,
  ]);

  const handleSuccess = React.useCallback(() => {
    posthog.capture("ship_purchased", {
      tier,
      payment_method: paymentMethod,
      price_eth: formatEther(price),
    });
    // Call the provided onSuccess callback
    onSuccess?.();
    // Trigger refetch to update the UI state
    refetch?.();
  }, [onSuccess, refetch, tier, paymentMethod, price]);

  // If UTC payment and not approved, show approve button
  if (paymentMethod === "UTC" && !utcApproved) {
    const utcAmount = formatEther(price);
    return (
      <TransactionButton
        transactionId={`approve-utc-ship-purchaser-tier-${tier}-${address}`}
        contractAddress={contractAddresses.UNIVERSAL_CREDITS as `0x${string}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi={UTC_APPROVE_ABI as any}
        functionName="approve"
        args={[contractAddresses.SHIP_PURCHASER as `0x${string}`, price]}
        className={`${className} whitespace-nowrap`}
        disabled={
          disabled ||
          !address ||
          (!utcBalancePending &&
            (utcBalance === undefined || (utcBalance as bigint) < price))
        }
        loadingText={`[APPROVING ${utcAmount} UTC...]`}
        errorText="[ERROR APPROVING]"
        onSuccess={() => {
          refetchAllowance();
          toast.success("UTC approved successfully!");
        }}
        onError={(error) => {
          console.error("Failed to approve UTC:", error);
          toast.error("Failed to approve UTC transfer");
        }}
        validateBeforeTransaction={() => {
          if (!address) {
            return "Please connect your wallet";
          }
          if (utcBalancePending) {
            return "Loading UTC balance...";
          }
          if (utcBalance === undefined || (utcBalance as bigint) < price) {
            return "Insufficient UTC balance";
          }
          return true;
        }}
      >
        <div className="flex flex-col items-center gap-2">
          {children}
          <span className="text-[11px] uppercase tracking-[0.08em]">
            [CLICK TO APPROVE {utcAmount} UTC]
          </span>
        </div>
      </TransactionButton>
    );
  }

  if (paymentMethod === "UTC") {
    return (
      <TransactionButton
        transactionId={`purchase-ships-utc-tier-${tier}-v${purchaseVariant}-${address}`}
        contractAddress={contractAddresses.SHIP_PURCHASER as `0x${string}`}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        abi={SHIP_PURCHASE_UTC_ABI as any}
        functionName="purchaseWithUC"
        args={[
          address,
          tier as number, // Tier is already 0-based (0-4) for contract (uint8)
          referralAddress,
          purchaseVariant,
        ]}
        className={className}
        disabled={disabled}
        loadingText="[PURCHASING...]"
        errorText="[ERROR PURCHASING]"
        onSuccess={handleSuccess}
        onError={onError}
        validateBeforeTransaction={validateBeforeTransaction}
      >
        <div className="flex flex-col items-center gap-2">
          {children}
          <span className="text-[11px] uppercase tracking-[0.08em]">
            [CLICK TO PURCHASE]
          </span>
        </div>
      </TransactionButton>
    );
  }

  return (
    <TransactionButton
      transactionId={`purchase-ships-flow-tier-${tier}-v${purchaseVariant}-${address}`}
      contractAddress={contractAddresses.SHIPS as `0x${string}`}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      abi={SHIP_PURCHASE_FLOW_ABI as any}
      functionName="purchaseWithFlow"
      args={[
        address,
        tier as number, // Tier is already 0-based (0-4) for contract (uint8)
        referralAddress,
        purchaseVariant,
      ]}
      value={price}
      className={className}
      disabled={disabled}
      loadingText="[PURCHASING...]"
      errorText="[ERROR PURCHASING]"
      onSuccess={handleSuccess}
      onError={onError}
      validateBeforeTransaction={validateBeforeTransaction}
    >
      {children}
    </TransactionButton>
  );
}
