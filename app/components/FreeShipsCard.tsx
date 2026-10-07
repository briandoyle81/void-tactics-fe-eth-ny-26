"use client";

import { useFreeShipClaimStatus } from "../hooks/useFreeShipClaimStatus";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { FreeShipClaimButton } from "./FreeShipClaimButton";
import { ClaimFreeButtonWeb2 } from "./ClaimFreeButtonWeb2";
import { SelfieCheckVerifyButton } from "./SelfieCheckVerifyButton";

const ACTION_CLASS =
  "w-full border-2 px-3 py-2 font-mono text-xs font-bold uppercase tracking-wider transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50";

/**
 * Command Deck claim card: a meter filling toward the next free batch, and
 * the claim action when it's ready (gated on Selfie Check for web3).
 */
export function FreeShipsCard() {
  const status = useFreeShipClaimStatus();
  const { refetch: refetchShips } = useOwnedShips();
  const { refetch: refetchShipsWeb2 } = useOwnedShipsWeb2();
  const refetch = status.appMode === "web2" ? refetchShipsWeb2 : refetchShips;
  const ready = status.isEligible && !status.isLoading && !status.hasError;

  return (
    <div
      className="grid gap-2 border-2 border-solid p-3"
      style={{ borderColor: "var(--color-phosphor-green)", backgroundColor: "rgba(0,0,0,0.35)" }}
    >
      <div className="flex items-baseline justify-between gap-2">
        <span
          className="text-lg font-bold uppercase tracking-wider text-phosphor-green"
          style={{ fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif" }}
        >
          Free ships
        </span>
        <span className="font-mono text-xs text-text-secondary">
          {status.isLoading ? "…" : ready ? "Ready" : (status.nextClaimInFormatted ?? "")}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden"
        style={{ backgroundColor: "var(--color-steel)" }}
        role="progressbar"
        aria-label="Next free ship batch"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(status.cooldownProgress * 100)}
      >
        <div
          className="h-full bg-phosphor-green transition-[width] duration-500"
          style={{ width: `${status.cooldownProgress * 100}%` }}
        />
      </div>
      {status.isSelfieCheckBlocking && status.address ? (
        <SelfieCheckVerifyButton
          address={status.address}
          onVerified={() => void status.refetchSelfieCheck()}
          className={`${ACTION_CLASS} border-amber text-amber hover:bg-amber/10`}
        >
          [VERIFY TO CLAIM]
        </SelfieCheckVerifyButton>
      ) : ready ? (
        status.appMode === "web2" ? (
          <ClaimFreeButtonWeb2
            onSuccess={async () => {
              await refetch();
            }}
            analyticsSurface="command_deck"
          />
        ) : (
          <FreeShipClaimButton
            isEligible={status.isEligible}
            isPending={status.web3Claim.isPending}
            isConfirmed={status.web3Claim.isConfirmed}
            claimFreeShips={status.web3Claim.claimFreeShips}
            analyticsSurface="command_deck"
            className={`${ACTION_CLASS} border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10`}
            onSuccess={async () => {
              await refetch();
            }}
          >
            [CLAIM FREE SHIPS]
          </FreeShipClaimButton>
        )
      ) : null}
    </div>
  );
}
