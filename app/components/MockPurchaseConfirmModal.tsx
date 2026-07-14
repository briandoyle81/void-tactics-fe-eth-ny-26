"use client";

import React from "react";

// Shared confirmation step for web2 purchases (ship packs and direct UTC
// purchases) that are paid in mock USD — inserted between "pick a tier" and
// actually calling the purchase route, since those routes have no real
// payment gate (see ManageNavyWeb2.tsx's doc comment / the security audit's
// finding #1) and previously executed immediately on click with no
// confirmation step at all, unlike web3's wallet-signature confirmation.
// Explicitly a mock: no real card is collected or charged, and the card
// number is a fixed placeholder — this exists purely to make the purchase
// flow feel like a real checkout for demo purposes.
export interface MockPurchaseConfirmModalProps {
  show: boolean;
  title: string;
  lineItems: Array<{ label: string; value: string }>;
  totalLabel: string;
  paymentMethod: "usd" | "utc";
  utcBalance?: number;
  utcBalanceAfter?: number;
  isProcessing: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}

export function MockPurchaseConfirmModal({
  show,
  title,
  lineItems,
  totalLabel,
  paymentMethod,
  utcBalance,
  utcBalanceAfter,
  isProcessing,
  onCancel,
  onConfirm,
}: MockPurchaseConfirmModalProps) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div
        className="bg-near-black border rounded-none p-6 max-w-md w-full mx-4"
        style={{ borderColor: "var(--color-cyan)" }}
      >
        <h3 className="text-xl font-bold text-cyan mb-4 font-mono tracking-widest text-center">
          {title}
        </h3>

        <div className="border border-gunmetal bg-black/30 p-3 mb-4 space-y-1.5">
          {lineItems.map((item) => (
            <div key={item.label} className="flex justify-between text-sm font-mono">
              <span className="text-text-muted">{item.label}</span>
              <span className="text-text-primary font-bold">{item.value}</span>
            </div>
          ))}
          <div className="flex justify-between text-sm font-mono pt-1.5 border-t border-gunmetal">
            <span className="text-text-secondary font-bold uppercase tracking-wide">Total</span>
            <span className="text-phosphor-green font-bold">{totalLabel}</span>
          </div>
        </div>

        {paymentMethod === "usd" ? (
          <div className="border border-amber/40 bg-amber/5 p-3 mb-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-amber/80 uppercase tracking-wide">Payment method</span>
              <span className="text-amber font-bold">•••• •••• •••• 4242</span>
            </div>
            <p className="text-[10px] text-amber/70 font-mono mt-2 leading-relaxed">
              {"// MOCK CHECKOUT — no real card is charged. For demo purposes only."}
            </p>
          </div>
        ) : (
          <div className="border border-cyan/40 bg-cyan/5 p-3 mb-4 space-y-1">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan/80 uppercase tracking-wide">Current balance</span>
              <span className="text-cyan font-bold">{utcBalance ?? 0} UTC</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-cyan/80 uppercase tracking-wide">Balance after</span>
              <span className="text-cyan font-bold">{utcBalanceAfter ?? 0} UTC</span>
            </div>
          </div>
        )}

        <div className="flex gap-4 justify-center">
          <button
            onClick={onCancel}
            disabled={isProcessing}
            className="px-6 py-2 border border-steel text-text-secondary hover:border-text-secondary hover:bg-steel/10 rounded-none font-mono font-bold transition-all duration-200 disabled:opacity-50"
          >
            CANCEL
          </button>
          <button
            onClick={onConfirm}
            disabled={isProcessing}
            className="px-6 py-2 border border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 rounded-none font-mono font-bold transition-all duration-200 disabled:opacity-50"
          >
            {isProcessing ? "PROCESSING…" : "CONFIRM PURCHASE"}
          </button>
        </div>
      </div>
    </div>
  );
}
