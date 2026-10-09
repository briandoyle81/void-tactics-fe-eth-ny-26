"use client";

import { FreeShipsCard } from "./FreeShipsCard";

/**
 * Shown in place of a ship list when the player owns no ships (e.g. run
 * fleet selection): the free-ship claim, or its countdown when on cooldown.
 * FreeShipsCard picks web3 or web2 itself, so both run-start screens share it.
 */
export function NoShipsClaimPanel() {
  return (
    <div
      className="flex flex-col items-center gap-4 border border-dashed p-6 text-center font-mono"
      style={{ borderColor: "var(--color-gunmetal)" }}
    >
      <p className="text-sm text-text-secondary">You don&apos;t have any ships yet. Claim your free ships to build a fleet.</p>
      <div className="w-full max-w-sm text-left">
        <FreeShipsCard />
      </div>
    </div>
  );
}
