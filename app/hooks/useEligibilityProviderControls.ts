import { useAccount, useReadContract } from "wagmi";
import type { Abi } from "viem";
import { CONTRACT_ABIS, getContractAddresses, ZERO_ADDRESS } from "../config/contracts";
import { useSelectedChainId } from "./useSelectedChainId";

// FreeShipClaim and TutorialClaim each gate their claim/completion function
// on their own `eligibilityProvider` — address(0) (the default) means fully
// open, no verification. See docs/eth-global-remote/frontend-handoff-attributes-costs-and-ai-2026-09-21.md
// §9. The two contracts have separate toggles even though they'd typically
// share one SelfieCheckEligibilityProvider instance.
export type EligibilityGatedContract = "FREE_SHIP_CLAIM" | "TUTORIAL_CLAIM";

const ABI_BY_CONTRACT: Record<EligibilityGatedContract, Abi> = {
  FREE_SHIP_CLAIM: CONTRACT_ABIS.FREE_SHIP_CLAIM as Abi,
  TUTORIAL_CLAIM: CONTRACT_ABIS.TUTORIAL_CLAIM as Abi,
};

/** The contract's own current `eligibilityProvider()`; ZERO_ADDRESS means verification is off. */
export function useEligibilityProvider(contract: EligibilityGatedContract) {
  const chainId = useSelectedChainId();
  const address = getContractAddresses(chainId)[contract] as `0x${string}`;
  const result = useReadContract({
    address,
    abi: ABI_BY_CONTRACT[contract],
    chainId,
    functionName: "eligibilityProvider",
    query: { enabled: address !== ZERO_ADDRESS },
  });
  return {
    ...result,
    contractAddress: address,
    isDeployedOnThisChain: address !== ZERO_ADDRESS,
  };
}

export function useEligibilityGatedContractOwner(contract: EligibilityGatedContract) {
  const chainId = useSelectedChainId();
  const address = getContractAddresses(chainId)[contract] as `0x${string}`;
  const { address: account } = useAccount();
  const { data } = useReadContract({
    address,
    abi: ABI_BY_CONTRACT[contract],
    chainId,
    functionName: "owner",
    query: { enabled: address !== ZERO_ADDRESS },
  });
  const owner = typeof data === "string" ? (data as `0x${string}`) : undefined;
  return {
    owner,
    isOwner: !!account && !!owner && account.toLowerCase() === owner.toLowerCase(),
  };
}

/** Base Sepolia's real verification backend — the address to restore when re-enabling. ZERO_ADDRESS on any chain it isn't deployed to (only Base Sepolia's address map has this key at all). */
export function useSelfieCheckEligibilityProviderAddress(): `0x${string}` {
  const chainId = useSelectedChainId();
  const addresses = getContractAddresses(chainId) as Record<string, `0x${string}` | undefined>;
  return addresses.SELFIE_CHECK_ELIGIBILITY_PROVIDER ?? ZERO_ADDRESS;
}
