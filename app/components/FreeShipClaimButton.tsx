"use client";

import React, { useEffect, useRef } from "react";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useAccount } from "../hooks/useAccount";
import { toast } from "react-hot-toast";
import posthog from "posthog-js";

interface FreeShipClaimButtonProps {
  isEligible: boolean;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  /** Where the button was shown (for PostHog funnels). */
  analyticsSurface?: "info" | "manage_navy" | "unknown";
  /** Fires when the user activates the button (before eligibility checks and claim). */
  onPress?: () => void;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function FreeShipClaimButton({
  isEligible,
  children,
  className = "",
  disabled = false,
  analyticsSurface = "unknown",
  onPress,
  onSuccess,
  onError,
}: FreeShipClaimButtonProps) {
  const { address } = useAccount();
  const { claimFreeShips, isPending, isConfirmed } = useFreeShipClaiming();
  const hasCalledOnSuccess = useRef(false);

  // Call onSuccess when transaction is confirmed (only once)
  useEffect(() => {
    if (isConfirmed && !hasCalledOnSuccess.current) {
      hasCalledOnSuccess.current = true;
      posthog.capture("free_ship_claimed", {
        wallet_address: address,
        surface: analyticsSurface,
      });
      onSuccess?.();
    }
  }, [isConfirmed, onSuccess, address, analyticsSurface]);

  // Reset the ref when starting a new transaction
  useEffect(() => {
    if (isPending) {
      hasCalledOnSuccess.current = false;
    }
  }, [isPending]);

  const handleClick = async () => {
    onPress?.();
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
    if (!isEligible) {
      toast.error(
        "You are not eligible for free ships or have already claimed them"
      );
      return;
    }

    try {
      posthog.capture("free_ship_claim_clicked", {
        wallet_address: address,
        surface: analyticsSurface,
      });
      await claimFreeShips();
      // Don't call onSuccess here - wait for confirmation via useEffect
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      onError?.(error);
    }
  };

  const isDisabled = disabled || !isEligible || isPending;

  // Remove rounded classes from className to enforce square corners
  const cleanedClassName = className
    .replace(/\brounded(-\w+)?\b/g, "")
    .trim();

  return (
    <button
      onClick={handleClick}
      disabled={isDisabled}
      className={`${cleanedClassName} ${
        isDisabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      style={{
        borderRadius: 0,
      }}
    >
      {isPending ? "[CLAIMING...]" : children}
    </button>
  );
}
