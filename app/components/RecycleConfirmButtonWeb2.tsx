"use client";

import React, { useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";

// The web2-specific CONFIRM button for RecycleConfirmModal.tsx — calls
// `DELETE /api/ships/[id]`. Pass to `confirmButton`.
interface RecycleConfirmButtonWeb2Props {
  shipId: number;
  onSuccess: () => void;
}

export function RecycleConfirmButtonWeb2({ shipId, onSuccess }: RecycleConfirmButtonWeb2Props) {
  const [isRecycling, setIsRecycling] = useState(false);

  const handleClick = async () => {
    setIsRecycling(true);
    try {
      await apiMutate(`/api/ships/${shipId}`, "DELETE");
      toast.success("Ship recycled successfully!");
      onSuccess();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to recycle ship");
    } finally {
      setIsRecycling(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={isRecycling}
      className="px-6 py-2 border border-warning-red text-warning-red hover:bg-warning-red/10 rounded-none font-mono font-bold transition-all duration-200"
    >
      {isRecycling ? "DESTROYING..." : "DESTROY SHIP"}
    </button>
  );
}
