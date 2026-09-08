"use client";

import React from "react";

// Shared between UTCPurchaseModal.tsx (web3) and UTCPurchaseModalWeb2.tsx —
// the tier-card body (amount / pay / receive / footer hint). Purely
// presentational; each side wraps it in its own interactive button
// (UTCPurchaseButton's on-chain TransactionButton vs a plain <button> that
// opens a confirm modal) since that's the genuinely different piece — the
// write mutation mechanism, not the card layout.
interface UTCPurchaseTierCardContentProps {
  utcAmountLabel: string;
  payLabel: string;
  footerLabel: string;
}

export function UTCPurchaseTierCardContent({
  utcAmountLabel,
  payLabel,
  footerLabel,
}: UTCPurchaseTierCardContentProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="text-base font-extrabold leading-tight">{utcAmountLabel}</div>
      <div className="grid grid-cols-1 gap-2 text-[12px] sm:grid-cols-2">
        <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
          <div className="opacity-75 text-[10px] uppercase tracking-wide">You pay</div>
          <div className="font-bold">{payLabel}</div>
        </div>
        <div className="border border-solid border-current/30 bg-black/20 px-2 py-1.5">
          <div className="opacity-75 text-[10px] uppercase tracking-wide">You receive</div>
          <div className="font-bold">{utcAmountLabel}</div>
        </div>
      </div>
      <div className="text-[10px] uppercase tracking-[0.08em] opacity-80">{footerLabel}</div>
    </div>
  );
}
