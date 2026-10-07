"use client";

import React from "react";
import ShipPurchaseInterface from "./ShipPurchaseInterface";

// Store › Ship packs (web3). Payment is chosen in checkout
// (ShipPurchaseInterface); prices differ per chain until normalized.
export default function Store() {
  return (
    <div className="w-full">
      <p className="mb-4 font-mono text-xs font-bold uppercase tracking-[0.08em] text-warning-red">
        Prices not yet normalized for all chains
      </p>
      <ShipPurchaseInterface />
    </div>
  );
}
