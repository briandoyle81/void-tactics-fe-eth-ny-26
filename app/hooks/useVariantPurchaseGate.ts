import { useAccount, useReadContract } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

// Minimal ERC721 read — works for whatever NFT `VariantPurchaseGate`
// currently requires, not just `ShatteredHiveMedal` specifically.
const ERC721_BALANCE_OF_ABI = [
  {
    inputs: [{ internalType: "address", name: "owner", type: "address" }],
    name: "balanceOf",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

/**
 * Whether the connected wallet can mint/claim a given variant.
 * `VariantPurchaseGate.requiredNft(variant)` returns the zero address for
 * an ungated variant (variant 1 today); a non-zero address means the
 * recipient must hold that NFT (variant 2 → ShatteredHiveMedal today) — see
 * docs/faction-2.md §5. Reads the gate live rather than hardcoding which
 * variant is gated, since that's owner-configurable.
 */
export function useVariantPurchaseGate(variant: number) {
  const { address } = useAccount();
  const activeChainId = useSelectedChainId();
  const contractAddresses = getContractAddresses(activeChainId);

  const variantPurchaseGateAddress = contractAddresses.VARIANT_PURCHASE_GATE as
    | `0x${string}`
    | undefined;
  const isGateDeployed =
    !!variantPurchaseGateAddress &&
    variantPurchaseGateAddress.toLowerCase() !== ZERO_ADDRESS;

  const { data: requiredNft, isLoading: isLoadingRequiredNft } = useReadContract({
    address: variantPurchaseGateAddress,
    abi: CONTRACT_ABIS.VARIANT_PURCHASE_GATE as Abi,
    functionName: "requiredNft",
    args: [variant],
    chainId: activeChainId,
    query: { enabled: isGateDeployed },
  });

  const requiredNftAddress = requiredNft as `0x${string}` | undefined;
  const isGated = !!requiredNftAddress && requiredNftAddress.toLowerCase() !== ZERO_ADDRESS;

  const { data: nftBalance, isLoading: isLoadingBalance } = useReadContract({
    address: requiredNftAddress,
    abi: ERC721_BALANCE_OF_ABI as Abi,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    chainId: activeChainId,
    query: { enabled: isGated && !!address },
  });

  const holdsRequiredNft = !isGated || ((nftBalance as bigint | undefined) ?? 0n) > 0n;

  return {
    isGateDeployed,
    isGated,
    requiredNftAddress,
    isUnlocked: !isGated || holdsRequiredNft,
    isLoading: isLoadingRequiredNft || (isGated && isLoadingBalance),
  };
}
