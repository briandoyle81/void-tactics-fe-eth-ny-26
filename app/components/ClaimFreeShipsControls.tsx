"use client";

import React from "react";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "Claim Free Ships" control's loading/error/eligible/cooldown states,
// ported verbatim from ManageNavy.tsx's `claimFreeShipControls`. The two
// claim buttons are caller-supplied render-props since the actual claim
// action is a real data/action difference (web3: `FreeShipClaimButton`
// wrapping a contract call; web2: a REST POST to `/api/ships/claim-free`).
// `claimStatusError` (a web3-only "the eligibility contract-read itself
// failed, but let the user try anyway" state) is optional — web2 has no
// analogous concept and always passes it as `null`/omitted, so that branch
// simply never renders there; it's kept here rather than dropped so web3's
// full state machine stays intact.
interface ClaimFreeShipsControlsProps {
  isLoadingClaimStatus: boolean;
  /** Only checked for truthiness — never rendered as text. */
  error: unknown;
  claimStatusError?: unknown;
  isEligible: boolean;
  nextClaimInFormatted: string | null;
  tryClaimButton?: React.ReactNode;
  claimButton: React.ReactNode;
}

export function ClaimFreeShipsControls({
  isLoadingClaimStatus,
  error,
  claimStatusError,
  isEligible,
  nextClaimInFormatted,
  tryClaimButton,
  claimButton,
}: ClaimFreeShipsControlsProps) {
  return (
    <div className="flex w-full flex-col items-stretch justify-center gap-3 sm:w-auto sm:flex-row sm:flex-nowrap sm:items-center sm:gap-4">
      {isLoadingClaimStatus && (
        <button
          disabled
          className="w-full justify-center px-6 py-3 rounded-none border-2 border-gunmetal text-text-muted font-mono font-bold tracking-wider opacity-50 cursor-not-allowed md:w-auto"
        >
          [CHECKING ELIGIBILITY...]
        </button>
      )}
      {!isLoadingClaimStatus && Boolean(error) && (
        <button
          disabled
          className="w-full justify-center px-6 py-3 rounded-none border-2 border-warning-red text-warning-red font-mono font-bold tracking-wider opacity-50 cursor-not-allowed md:w-auto"
        >
          [ERROR CLAIMING]
        </button>
      )}
      {!isLoadingClaimStatus && !error && Boolean(claimStatusError) && tryClaimButton}
      {!isLoadingClaimStatus && !error && !claimStatusError && isEligible && claimButton}
      {!isLoadingClaimStatus &&
        !error &&
        !claimStatusError &&
        !isEligible &&
        nextClaimInFormatted != null && (
          <div
            className="w-full px-3 py-3 text-center text-xs font-mono font-bold tracking-wider text-amber sm:px-6 sm:text-sm md:w-auto rounded-none border-2 border-amber/80 bg-amber/5"
            title="Time until you can claim free ships again"
          >
            NEXT CLAIM IN: {nextClaimInFormatted}
          </div>
        )}
    </div>
  );
}
