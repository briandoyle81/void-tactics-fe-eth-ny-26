"use client";

import React from "react";
import { useFreeShipClaiming } from "../hooks/useFreeShipClaiming";
import { useAccount } from "../hooks/useAccount";

const FreeShipClaiming: React.FC = () => {
  const { address } = useAccount();
  const {
    isEligible,
    hasClaimed,
    isLoadingClaimStatus,
    claimFreeShips,
    isPending,
  } = useFreeShipClaiming();

  if (!address) return null;
  if (hasClaimed) return null;
  if (!isEligible) return null;

  return (
    <div
      className="corner-bracket border-2 mb-8 relative"
      style={{ borderColor: "var(--color-phosphor-green)" }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2 border-b"
        style={{ borderColor: "var(--color-phosphor-green)", background: "rgba(107,255,143,0.06)" }}
      >
        <span className="text-[10px] font-mono text-text-muted tracking-widest">// ALLOCATION NOTICE //</span>
        <span className="text-[10px] font-mono text-phosphor-green tracking-widest animate-pulse">
          ● UNCLAIMED
        </span>
      </div>

      <div className="p-6">
        <h3 className="text-xl font-bold text-phosphor-green mb-1 tracking-widest font-mono">
          [FREE UNIT ALLOCATION]
        </h3>
        <p className="text-sm text-text-secondary font-mono mb-6">
          Your wallet qualifies for a complimentary vessel allocation.
          One-time issue — claim before authorization expires.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Allocation specs */}
          <div className="border border-gunmetal bg-near-black/60 p-4">
            <div className="text-[10px] font-mono text-text-muted tracking-widest mb-3">
              // ALLOCATION SPECS
            </div>
            <div className="space-y-2">
              {[
                ["STATUS", "UNCONSTRUCTED — REQUIRES BUILD"],
                ["GENERATION", "ONCHAIN RANDOMIZED"],
                ["LOADOUT", "UNIQUE TRAITS + EQUIPMENT"],
                ["ISSUE LIMIT", "ONE PER WALLET"],
              ].map(([label, value]) => (
                <div key={label} className="data-readout">
                  <span className="data-readout-label">{label}</span>
                  <span className="data-readout-value text-phosphor-green/90">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Claim action */}
          <div className="flex flex-col justify-between gap-4">
            <p className="text-xs text-text-muted font-mono leading-relaxed">
              Allocated vessels are generated at the block level. Stats and
              equipment are determined at claim time — no two ships are identical.
            </p>

            <div className="space-y-3">
              <button
                onClick={claimFreeShips}
                disabled={isPending || isLoadingClaimStatus}
                className="w-full px-6 py-3 border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold tracking-widest transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ borderRadius: 0 }}
              >
                {isPending ? "[PROCESSING...]" : "[CLAIM ALLOCATION]"}
              </button>

              {isLoadingClaimStatus && (
                <div className="flex items-center gap-2 text-text-muted font-mono text-xs">
                  <span className="animate-pulse tracking-widest">&gt;&gt; VERIFYING ELIGIBILITY...</span>
                </div>
              )}

              <p className="text-[10px] font-mono text-amber/80 text-center">
                // ONE-TIME AUTHORIZATION — NON-RENEWABLE //
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FreeShipClaiming;
