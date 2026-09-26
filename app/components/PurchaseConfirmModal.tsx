"use client";

import React from "react";

// Confirmation step for web3 token-paid ship-pack purchases (FLOW / UTC).
// The USD path already has its own multi-step checkout (FlowPaymentModal), so
// this is only inserted in front of the direct wallet-signed FLOW/UTC writes,
// which previously fired the moment a tier card was clicked (wallet signature
// was the only confirmation). Shows the tier card being bought, the price in
// the payment token, the approximate USD value, and Confirm / Cancel.
export interface PurchaseConfirmModalProps {
  show: boolean;
  title?: string;
  /** The tier card visual for the pack being purchased. */
  card: React.ReactNode;
  /** Price denominated in the payment token, e.g. "1.5 TOKENS" or "100 UTC". */
  tokenPriceLabel: string;
  /** Approximate fiat value, e.g. "≈ $1.99 USD". */
  usdApproxLabel: string;
  onCancel: () => void;
  /** The actual purchase action (a wallet-signing ShipPurchaseButton). Owns its
   * own pending/approve state, so this modal doesn't track transaction status. */
  confirmButton: React.ReactNode;
}

export function PurchaseConfirmModal({
  show,
  title = "CONFIRM PURCHASE",
  card,
  tokenPriceLabel,
  usdApproxLabel,
  onCancel,
  confirmButton,
}: PurchaseConfirmModalProps) {
  if (!show) return null;

  return (
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center bg-black/80 p-4"
      onClick={onCancel}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-none border border-cyan bg-near-black p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="mb-4 text-center font-mono text-xl font-bold tracking-widest text-cyan">
          {title}
        </h3>

        {/* Tier card being purchased. `relative` so the card's absolutely
            positioned tier badge anchors here, matching the grid layout. */}
        <div className="relative mb-4 border border-gunmetal bg-black/30 p-3">{card}</div>

        {/* Price breakdown */}
        <div className="mb-4 space-y-1.5 border border-gunmetal bg-black/30 p-3">
          <div className="flex justify-between font-mono text-sm">
            <span className="text-text-muted">Price</span>
            <span className="font-bold text-text-primary">{tokenPriceLabel}</span>
          </div>
          <div className="flex justify-between font-mono text-sm">
            <span className="text-text-muted">Approx. USD</span>
            <span className="font-bold text-phosphor-green">{usdApproxLabel}</span>
          </div>
        </div>

        <div className="flex justify-center gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-none border border-warning-red px-6 py-2 font-mono font-bold text-warning-red transition-all duration-200 hover:bg-warning-red/10"
          >
            CANCEL
          </button>
          {confirmButton}
        </div>
      </div>
    </div>
  );
}
