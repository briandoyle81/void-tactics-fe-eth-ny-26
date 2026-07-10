"use client";

import React from "react";

interface PaymentMethodOption {
  id: string;
  label: string;
  activeBorderClass: string;
  activeTextClass: string;
  activeBgClass: string;
}

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "Ship purchasing" panel wrapper (title, payment-method tabs, close
// button), ported verbatim from ManageNavy.tsx. Payment methods are
// caller-supplied since the two sides genuinely offer different options
// (web3: TOKENS/UTC/Fireblocks Flow; web2: USD/UTC, no wallet flow — see
// ShipPurchaseInterfaceWeb2.tsx's doc comment). `mobileTakeover`/
// `warningNote` default off/absent for web2, which doesn't yet have a
// compact-viewport detector or per-chain pricing caveat (see the
// ManageNavyWeb2-convergence plan's Phase 5).
interface ShipPurchasePanelProps {
  show: boolean;
  onClose: () => void;
  mobileTakeover?: boolean;
  warningNote?: string;
  paymentMethods: PaymentMethodOption[];
  activePaymentMethodId: string;
  onSelectPaymentMethod: (id: string) => void;
  children: React.ReactNode;
}

export function ShipPurchasePanel({
  show,
  onClose,
  mobileTakeover = false,
  warningNote,
  paymentMethods,
  activePaymentMethodId,
  onSelectPaymentMethod,
  children,
}: ShipPurchasePanelProps) {
  if (!show) return null;

  return (
    <div
      className={`${
        mobileTakeover
          ? "fixed inset-0 z-[340] mb-0 overflow-y-auto border-0 bg-near-black px-3 py-4"
          : "mb-8 border border-gunmetal bg-near-black px-3 py-5 sm:p-8"
      }`}
      style={{ borderRadius: 0 }}
    >
      <div className={mobileTakeover ? "mx-auto w-full max-w-6xl" : "mx-auto max-w-6xl"}>
        <div className="mb-6 flex flex-col gap-4 border-b border-cyan/20 pb-4 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
          <div className="flex min-w-0 flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-start">
            <div className="flex flex-col gap-1">
              <h4
                className="text-xl font-black uppercase tracking-[0.08em] text-primary sm:text-2xl"
                style={{
                  fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
                }}
              >
                Ship purchasing
              </h4>
              {warningNote && (
                <p
                  className="text-xs font-mono font-bold uppercase tracking-[0.08em] text-warning-red"
                  style={{
                    fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  }}
                >
                  {warningNote}
                </p>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
              <span className="font-mono text-sm text-secondary">
                PAYMENT METHOD:
              </span>
              <div className="flex flex-wrap gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => onSelectPaymentMethod(m.id)}
                    className={`px-3 py-1 border-2 font-mono font-bold tracking-wider transition-all duration-200 text-sm ${
                      activePaymentMethodId === m.id
                        ? `${m.activeBorderClass} ${m.activeTextClass} ${m.activeBgClass}`
                        : "border-gunmetal text-muted hover:border-steel hover:text-secondary"
                    }`}
                    style={{ borderRadius: 0 }}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="self-end text-2xl font-bold text-text-muted hover:text-text-primary sm:self-auto"
            type="button"
            aria-label="Close ship purchasing"
          >
            ×
          </button>
        </div>

        {children}
      </div>
    </div>
  );
}
