"use client";

import type { ReactNode } from "react";

// Shared between UTCPurchaseModal.tsx (web3) and UTCPurchaseModalWeb2.tsx
// (web2) — the overlay/header/balance-banner/"choose an amount" header,
// ported verbatim from UTCPurchaseModal.tsx. The tier grid itself stays
// per-mode (`children`) since the actual purchase mechanism diverges (a
// wallet TransactionButton per tier vs a plain button + confirm-modal
// flow). `extraOverlay` lets web2 render its confirm modal as a sibling
// inside the same fixed-position wrapper.
interface UTCPurchaseModalShellProps {
  onClose: () => void;
  balanceValueLabel: string;
  balanceDescription: ReactNode;
  chooseAmountDescription: ReactNode;
  children: ReactNode;
  extraOverlay?: ReactNode;
}

export function UTCPurchaseModalShell({
  onClose,
  balanceValueLabel,
  balanceDescription,
  chooseAmountDescription,
  children,
  extraOverlay,
}: UTCPurchaseModalShellProps) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
      <div
        className="bg-near-black border-2 p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto rounded-none"
        style={{ borderColor: "var(--color-cyan)" }}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-cyan font-mono tracking-wider">
            [PURCHASE UTC]
          </h2>
          <button
            onClick={onClose}
            className="text-cyan hover:text-cyan/80 transition-all duration-200 text-2xl font-bold"
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <div className="mb-5 p-4 bg-cyan/10 border border-cyan/40 rounded-none">
          <div className="flex justify-between items-center mb-2">
            <p className="text-cyan/80 text-sm font-mono">Current UTC balance</p>
            <p className="text-cyan text-sm font-mono font-bold">{balanceValueLabel}</p>
          </div>
          <p className="text-cyan/85 text-xs font-mono leading-relaxed">
            {balanceDescription}
          </p>
        </div>

        <header className="mb-5 border-b border-cyan/25 pb-4">
          <h3
            className="text-lg font-black uppercase tracking-[0.1em] text-cyan sm:text-xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            Choose an amount
          </h3>
          <p className="mt-2 max-w-2xl text-xs leading-relaxed text-text-secondary font-mono">
            {chooseAmountDescription}
          </p>
        </header>

        {children}
      </div>

      {extraOverlay}
    </div>
  );
}
