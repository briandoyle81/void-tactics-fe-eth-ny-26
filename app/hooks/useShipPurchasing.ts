import {
  useAccount,
  useBalance,
  useWriteContract,
  useWaitForTransactionReceipt,
  usePublicClient,
} from "wagmi";
import { getLegacyGasPriceOverridesForWrite } from "../utils/legacyGasPriceForWrite";
import { getContractAddresses } from "../config/contracts";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "./useOwnedShips";

const POST_PURCHASE_REFETCH_DELAY_MS = 2000;
import { useEffect } from "react";
import { getVariantForChainId } from "../config/networks";
import { useShipsPurchaseInfo } from "./useShipsPurchaseInfo";
import { useSelectedChainId } from "./useSelectedChainId";
import { useSwitchToSelectedChainIfNeeded } from "./useSwitchToSelectedChainIfNeeded";
import { formatEther } from "viem";

// Ships contract ABI for purchasing with FLOW
const shipsContractABI = [
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

export function useShipPurchasing() {
  const { address } = useAccount();
  const { refetch } = useOwnedShips();
  const activeChainId = useSelectedChainId();
  const switchToSelectedChainIfNeeded = useSwitchToSelectedChainIfNeeded();
  const contractAddresses = getContractAddresses(activeChainId);
  const chainVariant = getVariantForChainId(activeChainId);

  const {
    tiers,
    shipsPerTier,
    pricesWei,
    isLoading: isLoadingPurchaseInfo,
  } = useShipsPurchaseInfo();

  const { data: flowBalance, isLoading: isLoadingFlowBalance } = useBalance({
    address,
    chainId: activeChainId,
  });

  const { writeContract, isPending, error, data: hash } = useWriteContract();
  const publicClient = usePublicClient({ chainId: activeChainId });

  const {
    isLoading: isConfirming,
    isSuccess: isConfirmed,
    error: receiptError,
  } = useWaitForTransactionReceipt({
    hash,
    chainId: activeChainId,
  });

  useEffect(() => {
    if (error) {
      const errorMessage = error.message || "";
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Transaction failed: " + errorMessage);
      }
    }
  }, [error]);

  useEffect(() => {
    if (isConfirmed && hash) {
      toast.success("Ships purchased successfully!");
      setTimeout(() => refetch(), POST_PURCHASE_REFETCH_DELAY_MS);
    }
  }, [isConfirmed, hash, refetch]);

  useEffect(() => {
    if (receiptError) {
      const errorMessage = receiptError.message || "Transaction failed";
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Transaction failed: ${errorMessage}`);
      }
    }
  }, [receiptError]);

  const purchaseShips = async (tier: number) => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }

    if (tier < 0 || tier >= tiers.length) {
      toast.error("Invalid tier selected");
      return;
    }

    const tierPrice = pricesWei[tier] ?? 0n;
    if (tierPrice === 0n) {
      toast.error("Invalid tier price");
      return;
    }

    if (flowBalance && flowBalance.value < tierPrice) {
      toast.error("Insufficient FLOW balance");
      return;
    }

    const referralAddress =
      "0xac5b774D7a700AcDb528048B6052bc1549cd73B9" as `0x${string}`;

    try {
      await switchToSelectedChainIfNeeded();
      await writeContract({
        address: contractAddresses.SHIPS as `0x${string}`,
        abi: shipsContractABI,
        functionName: "purchaseWithFlow",
        args: [address, tier as number, referralAddress, chainVariant],
        value: tierPrice,
        chainId: activeChainId,
        ...(await getLegacyGasPriceOverridesForWrite(
          activeChainId,
          publicClient,
        )),
      });
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      if (
        errorMessage.includes("User rejected") ||
        errorMessage.includes("User denied") ||
        errorMessage.includes("rejected")
      ) {
        toast.error("Transaction declined by user");
      } else {
        toast.error("Failed to purchase ships");
      }
    }
  };

  const getPurchaseCosts = (tier: number, maxCount: number = 10) => {
    const p = pricesWei[tier];
    if (p === undefined) return [];

    const shipsInTier = Number(shipsPerTier[tier] || 1);
    const costs = [];

    for (let i = 1; i <= Math.min(maxCount, shipsInTier); i++) {
      costs.push({
        count: i,
        cost: p * BigInt(i),
        costFormatted: `${formatEther(p * BigInt(i))} FLOW`,
      });
    }
    return costs;
  };

  const canAfford = (tier: number, count: number) => {
    const p = pricesWei[tier];
    if (p === undefined || !flowBalance) return false;
    const totalCost = p * BigInt(count);
    return flowBalance.value >= totalCost;
  };

  return {
    tiers,
    prices: pricesWei,
    maxPerTier: shipsPerTier,
    flowBalance,

    isLoadingFlowBalance,
    isLoadingPurchaseInfo,

    purchaseShips,

    getPurchaseCosts,
    canAfford,

    isPending: isPending || isConfirming,
    error: error || receiptError,
  };
}
