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

async function safeFetch<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!res.ok) {
    let message = res.statusText;
    try {
      message = (JSON.parse(text) as { error?: string })?.error ?? message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }
  if (!text) return undefined as T;
  return JSON.parse(text) as T;
}

interface UsdConfirmModalProps {
  tier: number;
  price: number;
  onConfirm: () => void;
  onCancel: () => void;
}

function UsdConfirmModal({ tier, price, onConfirm, onCancel }: UsdConfirmModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70">
      <div
        className="border border-amber-500/60 bg-black p-6 flex flex-col gap-4"
        style={{ minWidth: 320, maxWidth: 420 }}
      >
        <div className="text-amber-400 font-mono text-xs tracking-widest">[SIMULATED PAYMENT]</div>
        <div className="text-white font-mono text-sm">
          You are about to simulate a USD purchase for Tier {tier} ships.
        </div>
        <div className="border border-zinc-700 p-3 font-mono text-xs text-zinc-300 flex flex-col gap-1">
          <div className="flex justify-between">
            <span className="text-zinc-500">TIER</span>
            <span>{tier}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">AMOUNT</span>
            <span className="text-green-400">${(price / 100).toFixed(2)} USD</span>
          </div>
          <div className="flex justify-between">
            <span className="text-zinc-500">PAYMENT</span>
            <span className="text-amber-400">SIMULATED — no charge</span>
          </div>
        </div>
        <div className="text-zinc-500 font-mono text-xs">
          This is a demo environment. No real payment will be processed.
        </div>
        <div className="flex gap-3 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className="font-mono text-xs px-4 py-2 border border-zinc-600 text-zinc-400 hover:text-white hover:border-zinc-400 transition-colors"
            style={{ borderRadius: 0 }}
          >
            [CANCEL]
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="font-mono text-xs px-4 py-2 border border-green-600 text-green-400 hover:text-green-300 hover:border-green-400 transition-colors"
            style={{ borderRadius: 0 }}
          >
            [CONFIRM PURCHASE]
          </button>
        </div>
      </div>
    </div>
  );
}

export function ShipPurchaseButton({
  tier,
  price,
  paymentMethod,
  children,
  className = "",
  disabled = false,
  onSuccess,
  onError,
  refetch,
}: ShipPurchaseButtonProps) {
  const [isPending, setIsPending] = useState(false);
  const [showUsdModal, setShowUsdModal] = useState(false);

  const executePurchase = async () => {
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

      const data = await safeFetch<{ ships: { id: number; name: string }[] }>(res);
      const ships = data?.ships ?? [];
      toast.success(`${ships.length} ship${ships.length !== 1 ? "s" : ""} added to your fleet!`);
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

  const handleClick = () => {
    if (paymentMethod === "USD") {
      setShowUsdModal(true);
    } else {
      void executePurchase();
    }
  };

  const handleUsdConfirm = () => {
    setShowUsdModal(false);
    void executePurchase();
  };

  return (
    <>
      {showUsdModal && (
        <UsdConfirmModal
          tier={tier}
          price={price}
          onConfirm={handleUsdConfirm}
          onCancel={() => setShowUsdModal(false)}
        />
      )}
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || isPending}
        className={className}
        style={{ borderRadius: 0 }}
      >
        {isPending ? "[PURCHASING...]" : children}
      </button>
    </>
  );
}
