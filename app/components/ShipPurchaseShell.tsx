"use client";

import React from "react";

// Shared between ShipPurchaseInterface.tsx (web3) and
// ShipPurchaseInterfaceWeb2.tsx (web2) — the outer shell (header, tier-grid
// wrapper + "One mint. Full fleet." aside, footer copy). The tier cards stay
// caller-built; each opens that mode's checkout (CheckoutSheet), where the
// payment method is chosen.
interface ShipPurchaseShellProps {
  tierCards: React.ReactNode[];
  footerPaymentNote: string;
  /** Controls at the right of the header — the web3 interface's faction
   * toggle (gated on the Shattered Hive medal). Web2 omits it. */
  topContent?: React.ReactNode;
  /** A small note under the description, e.g. web3's per-chain pricing caveat. */
  notice?: React.ReactNode;
}

export function ShipPurchaseShell({
  tierCards,
  footerPaymentNote,
  topContent,
  notice,
}: ShipPurchaseShellProps) {
  return (
    <div className="w-full">
      <header className="mb-5 flex flex-col gap-4 border-b border-cyan/25 pb-4 md:flex-row md:items-end md:justify-between">
        <div className="min-w-0">
          <h3
            className="text-xl font-black uppercase tracking-[0.12em] text-cyan sm:text-2xl"
            style={{
              fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
            }}
          >
            Expand your fleet
          </h3>
          <p
            className="mt-1 max-w-xl text-sm leading-snug text-text-secondary"
            style={{
              fontFamily:
                "var(--font-jetbrains-mono), 'Courier New', monospace",
            }}
          >
            Bigger packs add guaranteed veterans.
          </p>
          {notice && (
            <p
              className="mt-1 text-[11px] text-amber/80"
              style={{
                fontFamily:
                  "var(--font-jetbrains-mono), 'Courier New', monospace",
              }}
            >
              {notice}
            </p>
          )}
        </div>
        {topContent && <div className="shrink-0">{topContent}</div>}
      </header>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {tierCards}

        <aside
          className="flex min-h-[420px] flex-col justify-center gap-5 border-2 border-solid border-cyan/45 bg-black/25 px-5 py-5 text-left"
          style={{
            fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
          }}
        >
          <h4 className="text-2xl font-bold leading-tight tracking-wide text-cyan sm:text-3xl">
            One mint.{" "}
            <span className="font-semibold text-amber">Full fleet</span>.
          </h4>
          <p className="text-base font-medium leading-snug text-text-primary sm:text-lg">
            Higher tiers stack more{" "}
            <span className="font-semibold text-amber">
              guaranteed veterans
            </span>{" "}
            and a bigger fleet in one mint.
          </p>
          <p className="text-sm font-medium leading-relaxed text-cyan/90 sm:text-base">
            <span className="md:hidden">Tap the tier you want</span>
            <span className="hidden md:inline">Click the tier you want</span>
            {" and mint the whole roster."}
          </p>
        </aside>
      </div>
      <p
        className="mt-4 text-[11px] uppercase tracking-[0.08em] text-text-muted"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        {footerPaymentNote}
      </p>
      <p
        className="mt-1 text-[11px] uppercase tracking-[0.08em] text-text-muted"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
        }}
      >
        Preview ships are examples only. Final minted ships may differ in
        loadout and visuals.
      </p>
    </div>
  );
}
