"use client";

import type { ReactNode } from "react";

// Shared between UTCPurchasePanel.tsx (web3) and UTCPurchasePanelWeb2.tsx
// (web2), shown in Store › Credits — the balance banner and "choose an
// amount" header. The tier grid stays per-mode (`children`) since the
// purchase mechanism diverges (a wallet TransactionButton per tier vs a
// plain button + confirm flow). `extraOverlay` lets web2 render its confirm
// modal alongside.
interface UTCPurchasePanelShellProps {
  balanceValueLabel: string;
  balanceDescription: ReactNode;
  chooseAmountDescription: ReactNode;
  /** Extra lines under the balance, e.g. a faucet link. */
  balanceFooter?: ReactNode;
  children: ReactNode;
  extraOverlay?: ReactNode;
}

export function UTCPurchasePanelShell({
  balanceValueLabel,
  balanceDescription,
  chooseAmountDescription,
  balanceFooter,
  children,
  extraOverlay,
}: UTCPurchasePanelShellProps) {
  return (
    <div className="w-full">
      <div className="mb-5 p-4 bg-cyan/10 border border-cyan/40 rounded-none">
        <div className="flex justify-between items-center mb-2">
          <p className="text-cyan/80 text-sm font-mono">Current UTC balance</p>
          <p className="text-cyan text-sm font-mono font-bold">{balanceValueLabel}</p>
        </div>
        <p className="text-cyan/85 text-xs font-mono leading-relaxed">
          {balanceDescription}
        </p>
        {balanceFooter}
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

      {extraOverlay}
    </div>
  );
}
