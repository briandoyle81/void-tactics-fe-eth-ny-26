"use client";

import { useAccount } from "wagmi";
import { useAppMode } from "./useAppMode";
import { useCurrentUser } from "./useCurrentUser";
import { useFreeShipClaiming } from "./useFreeShipClaiming";
import { useClaimFreeEligibilityWeb2 } from "./useClaimFreeEligibilityWeb2";
import { useSelfieCheckEligibility } from "./useSelfieCheckEligibility";

// Matches `CLAIM_COOLDOWN_MS` in app/api/ships/claim-free/route.ts (web2's
// cooldown is a fixed server-side constant, not exposed by the eligibility
// endpoint — unlike web3's `claimCooldownPeriod` contract read).
const WEB2_CLAIM_COOLDOWN_SECONDS = 28 * 24 * 60 * 60;

/**
 * Free-ship claim state for whichever mode is active — shared by the HUD's
 * free-ships pill and the Command Deck's claim card. Web3 also returns the
 * claim action; web2 claims through ClaimFreeButtonWeb2.
 */
export function useFreeShipClaimStatus() {
  const appMode = useAppMode();
  const { isConnected, address } = useAccount();
  const { isLoggedIn } = useCurrentUser();
  const web3 = useFreeShipClaiming();
  const web2 = useClaimFreeEligibilityWeb2();

  // Gates the web3 claim on Selfie Check verification (see
  // docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §3) — web2 has no
  // analogous concept.
  const selfieCheckEligibility = useSelfieCheckEligibility("freeShipClaim", address);
  const isSelfieCheckBlocking =
    appMode !== "web2" && selfieCheckEligibility.isEligible === false;

  const isWeb2 = appMode === "web2";
  const isSignedIn = isWeb2 ? isLoggedIn : isConnected;
  const isEligible = (isWeb2 ? web2.isEligible : web3.isEligible) && !isSelfieCheckBlocking;
  const isLoading = isWeb2 ? web2.isLoadingClaimStatus : web3.isLoadingClaimStatus;
  // Web2 has no wallet-tx failure mode — the claim POST's own errors are
  // toasted inside ClaimFreeButtonWeb2.
  const hasError = isWeb2
    ? Boolean(web2.claimStatusError)
    : Boolean(web3.claimStatusError) || Boolean(web3.error);
  const cooldownSeconds = isWeb2 ? WEB2_CLAIM_COOLDOWN_SECONDS : web3.cooldownSeconds;
  const secondsUntilNextClaim = isWeb2 ? web2.secondsUntilNextClaim : web3.secondsUntilNextClaim;

  return {
    appMode,
    address,
    isSignedIn,
    isEligible,
    isLoading,
    hasError,
    /** "3d 4h" style countdown while on cooldown, else null. */
    nextClaimInFormatted: isWeb2 ? web2.nextClaimInFormatted : web3.nextClaimInFormatted,
    secondsUntilNextClaim,
    cooldownSeconds,
    /** 0 right after a claim, 1 when the next batch is ready. */
    cooldownProgress:
      isEligible || !cooldownSeconds || secondsUntilNextClaim == null
        ? 1
        : Math.min(1, Math.max(0, 1 - secondsUntilNextClaim / cooldownSeconds)),
    isSelfieCheckBlocking,
    refetchSelfieCheck: selfieCheckEligibility.refetchIsEligible,
    web3Claim: {
      claimFreeShips: web3.claimFreeShips,
      isPending: web3.isPending,
      isConfirmed: web3.isConfirmed,
    },
  };
}
