"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import posthog from "posthog-js";
import { apiMutate } from "../lib/apiMutate";
import { manageNavyActionButtonClassName } from "./ManageNavyActionButton";
import { useCurrentUser } from "../hooks/useCurrentUser";

// The web2-specific CLAIM FREE SHIPS button for ClaimFreeShipsControls.tsx
// — calls `POST /api/ships/claim-free`.
interface ClaimFreeButtonWeb2Props {
  onSuccess: () => void;
  /** Fired on click, before the request resolves — mirrors web3's FreeShipClaimButton onPress (used there to dismiss the drone-factory tutorial step). */
  onPress?: () => void;
  /** Where the button was shown (for PostHog funnels) — mirrors FreeShipClaimButton's analyticsSurface. */
  analyticsSurface?: "info" | "manage_navy" | "unknown";
}

export function ClaimFreeButtonWeb2({
  onSuccess,
  onPress,
  analyticsSurface = "unknown",
}: ClaimFreeButtonWeb2Props) {
  const [isClaiming, setIsClaiming] = useState(false);
  const { userId } = useCurrentUser();

  const handleClick = async () => {
    onPress?.();
    setIsClaiming(true);
    try {
      posthog.capture("free_ship_claim_clicked", { user_id: userId, surface: analyticsSurface });
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        "/api/ships/claim-free",
        "POST",
      );
      posthog.capture("free_ship_claimed", { user_id: userId, surface: analyticsSurface });
      toast.success(`Claimed ${result.ships.length} free ship(s)`);
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to claim free ships");
    } finally {
      setIsClaiming(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isClaiming}
      className={manageNavyActionButtonClassName("green")}
    >
      {isClaiming ? "[CLAIMING...]" : "[CLAIM FREE SHIPS]"}
    </button>
  );
}
