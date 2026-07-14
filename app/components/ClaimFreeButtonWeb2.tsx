"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { manageNavyActionButtonClassName } from "./ManageNavyActionButton";

// The web2-specific CLAIM FREE SHIPS button for ClaimFreeShipsControls.tsx
// — calls `POST /api/ships/claim-free`.
interface ClaimFreeButtonWeb2Props {
  onSuccess: () => void;
}

export function ClaimFreeButtonWeb2({ onSuccess }: ClaimFreeButtonWeb2Props) {
  const [isClaiming, setIsClaiming] = useState(false);

  const handleClick = async () => {
    setIsClaiming(true);
    try {
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        "/api/ships/claim-free",
        "POST",
      );
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
