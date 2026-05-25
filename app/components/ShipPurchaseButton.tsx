"use client";

import React, { useState } from "react";
import toast from "react-hot-toast";

interface ShipPurchaseButtonProps {
  tier: number;
  price: number;
  paymentMethod: "USD" | "UTC";
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
  refetch?: () => void;
}

export function ShipPurchaseButton({
  tier,
  paymentMethod,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  refetch,
}: ShipPurchaseButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleClick = async () => {
    setIsPending(true);
    try {
      const endpoint =
        paymentMethod === "UTC"
          ? "/api/ships/purchase/utc"
          : "/api/ships/purchase/usd";

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier }),
      });

      if (!res.ok) {
        const data = await res.json() as { error?: string };
        throw new Error(data.error ?? "Purchase failed");
      }

      const data = await res.json() as { ships: { id: number; name: string }[] };
      toast.success(`${data.ships.length} ship${data.ships.length !== 1 ? "s" : ""} added to your fleet!`);
      refetch?.();
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
      {isPending ? "[PURCHASING...]" : children}
    </button>
  );
}
