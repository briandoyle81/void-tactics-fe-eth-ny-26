"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";

// The web2-specific CONFIRM button for FleeSafetySwitch.tsx's retreat
// modal — calls `/api/games/[id]/flee` via `apiMutate`. Pass to
// `renderConfirmButton`.
interface FleeConfirmButtonWeb2Props {
  gameId: number;
  onSuccess: () => void;
}

export function FleeConfirmButtonWeb2({ gameId, onSuccess }: FleeConfirmButtonWeb2Props) {
  const [isFleeing, setIsFleeing] = useState(false);

  const handleClick = async () => {
    setIsFleeing(true);
    try {
      await apiMutate(`/api/games/${gameId}/flee`, "POST");
      toast.success("Disengaged from battle.");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Disengage failed");
    } finally {
      setIsFleeing(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isFleeing}
      className="flex-1 px-4 py-2 bg-warning-red/20 hover:bg-warning-red/30 text-white font-mono font-bold rounded-none border border-warning-red transition-colors tracking-wider"
    >
      {isFleeing ? "DISENGAGING..." : "CONFIRM"}
    </button>
  );
}
