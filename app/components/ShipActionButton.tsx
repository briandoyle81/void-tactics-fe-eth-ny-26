"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";
import posthog from "posthog-js";

interface ShipActionButtonProps {
  action: "construct" | "constructAll" | "constructShips" | "recycle";
  shipId?: number;
  shipIds?: number[];
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export function ShipActionButton({
  action,
  shipId,
  shipIds,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
}: ShipActionButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      let res: Response;

      if (action === "recycle") {
        const ids = (shipIds ?? []).map(Number);
        if (ids.length === 0) throw new Error("No ships selected for recycling");
        res = await fetch("/api/ships/recycle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shipIds: ids }),
        });
      } else if (action === "constructAll") {
        res = await fetch("/api/ships/construct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ all: true }),
        });
      } else if (action === "constructShips") {
        const ids = (shipIds ?? []).map(Number);
        if (ids.length === 0) throw new Error("No ships selected for construction");
        res = await fetch("/api/ships/construct", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ shipIds: ids }),
        });
      } else {
        // single construct
        if (!shipId) throw new Error("No ship ID provided");
        res = await fetch(`/api/ships/${Number(shipId)}/construct`, {
          method: "POST",
        });
      }

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Action failed");
      }

      posthog.capture(action === "recycle" ? "ships_recycled" : "ships_constructed", {
        action,
        ship_count: action === "construct" ? 1 : (shipIds?.length ?? 0),
      });

      onSuccess?.();
    } catch (err) {
      const e = err instanceof Error ? err : new Error(String(err));
      toast.error(e.message);
      onError?.(e);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      className={className}
      style={{ borderRadius: 0 }}
    >
      {isPending ? `[${action.toUpperCase()}...]` : children}
    </button>
  );
}
