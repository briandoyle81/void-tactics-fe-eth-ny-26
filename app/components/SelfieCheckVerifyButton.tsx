"use client";

import {
  IDKitRequestWidget,
  selfieCheckLegacy,
  type IDKitResult,
  type RpContext,
} from "@worldcoin/idkit";
import { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { WORLD_APP_ID, WORLD_SELFIE_CHECK_ACTION } from "../config/tournament";

// Same proof-extraction shape as TournamentRegister.tsx's extractProofFields — IDKit v4 with
// allow_legacy_proofs=true returns IDKitResultV3, responses[0] carries
// {proof, merkle_root, nullifier}. Here the fields go to our own backend's off-chain verify call
// (app/api/selfie-check/verify/route.ts), not a contract, since Selfie Check has no on-chain
// proof-verification path.
function extractProofFields(
  result: IDKitResult,
): { merkle_root: string; nullifier_hash: string; proof: string } | null {
  if ("responses" in result && Array.isArray(result.responses) && result.responses.length > 0) {
    const r = result.responses[0] as { proof: string; merkle_root: string; nullifier: string };
    return { merkle_root: r.merkle_root, nullifier_hash: r.nullifier, proof: r.proof };
  }
  return null;
}

/**
 * Headless Selfie Check verification flow — triggers World's widget and relays the result to our
 * backend, which verifies it off-chain against World's API and calls
 * SelfieCheckEligibilityProvider.markVerified (see
 * docs/eth-global-remote/uniswap-lottery-selfie-check-frontend-integration.md §3). Returns
 * `openWidget` to trigger from any custom button/callback, and `widgetElement` to mount once
 * anywhere in the tree. Shared by FreeShipClaim and TutorialClaim gating — verifying once covers
 * both, same shared-instance eligibility window.
 */
export function useSelfieCheckVerifyFlow(address: `0x${string}` | undefined, onVerified: () => void) {
  const [widgetOpen, setWidgetOpen] = useState(false);
  const [rpContext, setRpContext] = useState<RpContext | null>(null);
  const [fetchingContext, setFetchingContext] = useState(false);
  const [verifying, setVerifying] = useState(false);

  const openWidget = useCallback(async () => {
    if (!address) return;
    setFetchingContext(true);
    try {
      const res = await fetch(
        `/api/world-id/rp-context?action=${encodeURIComponent(WORLD_SELFIE_CHECK_ACTION)}`,
      );
      if (!res.ok) throw new Error("Could not fetch proof context");
      const ctx = (await res.json()) as RpContext;
      setRpContext(ctx);
      setWidgetOpen(true);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start verification");
    } finally {
      setFetchingContext(false);
    }
  }, [address]);

  const handleResult = useCallback(
    async (result: IDKitResult) => {
      if (!address) return;
      const fields = extractProofFields(result);
      if (!fields) {
        toast.error("Unexpected proof format from World ID.");
        return;
      }
      setVerifying(true);
      try {
        const res = await fetch("/api/selfie-check/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ player: address, ...fields }),
        });
        const body = (await res.json()) as { success?: boolean; error?: string };
        if (!res.ok || !body.success) {
          throw new Error(body.error ?? "Verification failed");
        }
        toast.success("Selfie Check verified!");
        onVerified();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Verification failed");
      } finally {
        setVerifying(false);
        setRpContext(null);
      }
    },
    [address, onVerified],
  );

  const widgetElement = rpContext ? (
    <IDKitRequestWidget
      app_id={WORLD_APP_ID}
      action={WORLD_SELFIE_CHECK_ACTION}
      rp_context={rpContext}
      allow_legacy_proofs={true}
      preset={selfieCheckLegacy({ signal: address })}
      environment="staging"
      open={widgetOpen}
      onOpenChange={setWidgetOpen}
      onSuccess={(r) => void handleResult(r)}
    />
  ) : null;

  return {
    openWidget: () => void openWidget(),
    widgetElement,
    isBusy: fetchingContext || verifying,
  };
}

interface SelfieCheckVerifyButtonProps {
  address: `0x${string}`;
  onVerified: () => void;
  className?: string;
  children?: React.ReactNode;
}

/** Standalone button wrapper around useSelfieCheckVerifyFlow — the common case. */
export function SelfieCheckVerifyButton({
  address,
  onVerified,
  className,
  children,
}: SelfieCheckVerifyButtonProps) {
  const { openWidget, widgetElement, isBusy } = useSelfieCheckVerifyFlow(address, onVerified);

  return (
    <>
      {widgetElement}
      <button type="button" onClick={openWidget} disabled={isBusy} className={className}>
        {isBusy ? "Verifying…" : (children ?? "Verify with Selfie Check")}
      </button>
    </>
  );
}
