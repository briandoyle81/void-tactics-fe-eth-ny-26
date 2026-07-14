"use client";

import React from "react";

// Shared between ManageNavy.tsx (web3) and ManageNavyWeb2.tsx (web2) — the
// "[RECYCLE — LOCKED]" block shown in place of the bulk recycle button
// below the purchase threshold, ported verbatim from ManageNavy.tsx.
interface RecycleLockedNoticeProps {
  purchasedCount: number;
  threshold: number;
}

export function RecycleLockedNotice({ purchasedCount, threshold }: RecycleLockedNoticeProps) {
  return (
    <div className="flex flex-col gap-1">
      <div
        className="w-full cursor-not-allowed px-6 py-3 text-center text-sm font-mono font-bold tracking-wider md:w-auto rounded-none border-2"
        style={{
          color: "color-mix(in srgb, var(--color-warning-red) 40%, transparent)",
          borderColor: "color-mix(in srgb, var(--color-warning-red) 30%, transparent)",
        }}
      >
        [RECYCLE — LOCKED]
      </div>
      <p
        className="text-[10px] tracking-wider text-center md:text-left"
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          color: "color-mix(in srgb, var(--color-text-muted) 70%, transparent)",
        }}
      >
        Unlocks after {threshold} ship purchases ({purchasedCount}/{threshold})
      </p>
    </div>
  );
}
