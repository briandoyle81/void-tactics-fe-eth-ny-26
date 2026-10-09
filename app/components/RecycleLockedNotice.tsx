"use client";

import React from "react";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "[RECYCLE — LOCKED]" block shown in place of the bulk recycle button
// below the purchase threshold.
interface RecycleLockedNoticeProps {
  purchasedCount: number;
  threshold: number;
}

export function RecycleLockedNotice({ purchasedCount, threshold }: RecycleLockedNoticeProps) {
  const unlockText = `Unlocks after ${threshold} ship purchases (${purchasedCount}/${threshold})`;
  return (
    // The unlock condition is a tooltip (hover or keyboard focus) so the
    // locked button sits in the action row at the same height as the rest.
    <div className="group relative w-full md:w-auto">
      <div
        tabIndex={0}
        aria-describedby="recycle-locked-tooltip"
        className="w-full cursor-not-allowed px-6 py-3 text-center text-sm font-mono font-bold tracking-wider md:w-auto rounded-none border-2 outline-none"
        style={{
          color: "color-mix(in srgb, var(--color-warning-red) 40%, transparent)",
          borderColor: "color-mix(in srgb, var(--color-warning-red) 30%, transparent)",
        }}
      >
        [RECYCLE — LOCKED]
      </div>
      <div
        id="recycle-locked-tooltip"
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-full z-40 mt-2 -translate-x-1/2 whitespace-nowrap border border-solid border-gunmetal bg-near-black px-3 py-1.5 text-xs tracking-wider text-text-secondary opacity-0 shadow-lg transition-opacity duration-150 group-hover:opacity-100 group-focus-within:opacity-100"
        style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
      >
        {unlockText}
      </div>
    </div>
  );
}
