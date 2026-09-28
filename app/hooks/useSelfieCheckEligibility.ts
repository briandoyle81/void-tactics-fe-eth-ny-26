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
 * Gates FreeShipClaim/TutorialClaim on SelfieCheckEligibilityProvider when the
 * consuming contract's `eligibilityProvider()` is non-zero. address(0) means
 * fully open, which is the live Base Sepolia state after
 * FreeShipClaim/TutorialClaim.setEligibilityProvider(address(0)) (see
 * docs/eth-global-remote/frontend-handoff-combat-blocking-and-ship-specials-2026-09-26.md §3).
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
