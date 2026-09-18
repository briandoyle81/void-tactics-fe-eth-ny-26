import { useReadContract } from "wagmi";
import { baseSepolia } from "viem/chains";
import type { Abi } from "viem";
import { CONTRACT_ABIS, CONTRACT_ADDRESSES_BY_CHAIN_ID } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";

const FREE_SHIP_CLAIM_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .FREE_SHIP_CLAIM as `0x${string}`;
const FREE_SHIP_CLAIM_ABI = CONTRACT_ABIS.FREE_SHIP_CLAIM as Abi;
const TUTORIAL_CLAIM_ADDRESS = CONTRACT_ADDRESSES_BY_CHAIN_ID[baseSepolia.id]
  .TUTORIAL_CLAIM as `0x${string}`;
const TUTORIAL_CLAIM_ABI = CONTRACT_ABIS.TUTORIAL_CLAIM as Abi;
const SELFIE_CHECK_ABI = CONTRACT_ABIS.SELFIE_CHECK_ELIGIBILITY_PROVIDER as Abi;

type ClaimKind = "freeShipClaim" | "tutorialClaim";

/**
 * Gates FreeShipClaim/TutorialClaim on SelfieCheckEligibilityProvider (see
 * docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §3). Reads the
 * consuming contract's own `eligibilityProvider()` pointer rather than assuming it's wired — per
 * the doc, address(0) there means "not configured yet, stays fully open," which is real current
 * state until the redeploy that sets it, not a bug. Only once that pointer is non-zero does
 * eligibility genuinely gate the claim. Per the doc's explicit instruction: check this before
 * showing a claim button, don't just catch the NotEligible revert.
 */
export function useSelfieCheckEligibility(kind: ClaimKind, player: `0x${string}` | undefined) {
  const activeChainId = useSelectedChainId();
  const isSupported = activeChainId === baseSepolia.id;

  const consumingContract =
    kind === "freeShipClaim"
      ? { address: FREE_SHIP_CLAIM_ADDRESS, abi: FREE_SHIP_CLAIM_ABI }
      : { address: TUTORIAL_CLAIM_ADDRESS, abi: TUTORIAL_CLAIM_ABI };

  const { data: providerAddressData, isLoading: isLoadingProvider } = useReadContract({
    address: consumingContract.address,
    abi: consumingContract.abi,
    functionName: "eligibilityProvider",
    chainId: baseSepolia.id,
    query: { enabled: isSupported && !!consumingContract.address },
  });

  const providerAddress = providerAddressData as `0x${string}` | undefined;
  const isGateConfigured =
    !!providerAddress && providerAddress.toLowerCase() !== ZERO_ADDRESS;

  const {
    data: isEligibleData,
    isLoading: isLoadingEligibility,
    refetch: refetchIsEligible,
  } = useReadContract({
    address: providerAddress,
    abi: SELFIE_CHECK_ABI,
    functionName: "isEligible",
    args: player ? [player] : undefined,
    chainId: baseSepolia.id,
    query: { enabled: isSupported && isGateConfigured && !!player },
  });

  return {
    // Not configured (provider unset) means fully open — same convention this contract already
    // uses for droneStorefront == address(0) elsewhere in this repo.
    isEligible: isGateConfigured ? (isEligibleData as boolean | undefined) : true,
    isGateConfigured,
    isLoading: isLoadingProvider || (isGateConfigured && isLoadingEligibility),
    refetchIsEligible,
  };
}
