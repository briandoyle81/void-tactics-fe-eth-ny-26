"use client";

import React from "react";
import ShipPurchaseInterface from "./ShipPurchaseInterface";
import { ShipPurchasePanel } from "./ShipPurchasePanel";

// The "Store" tab (web3) — the ship-pack purchase UI that used to live inline
// in the Manage Navy tab. Manage Navy's [BUY NEW SHIPS] buttons now navigate
// here (void-tactics-navigate-to-store) instead of opening an inline panel.
export default function Store() {
  const [paymentMethod, setPaymentMethod] = React.useState<"FLOW" | "UTC" | "USD">(
    "FLOW",
  );

  const goToManageNavy = React.useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-manage-navy"));
  }, []);

  return (
    <ShipPurchasePanel
      show
      onClose={goToManageNavy}
      warningNote="Prices not yet normalized for all chains"
      paymentMethods={[
        { id: "FLOW", label: "TOKENS", activeBorderClass: "border-cyan", activeTextClass: "text-cyan", activeBgClass: "bg-cyan/10" },
        { id: "UTC", label: "UTC", activeBorderClass: "border-amber", activeTextClass: "text-amber", activeBgClass: "bg-amber/10" },
        { id: "USD", label: "Fireblocks Flow", activeBorderClass: "border-phosphor-green", activeTextClass: "text-phosphor-green", activeBgClass: "bg-phosphor-green/10" },
      ]}
      activePaymentMethodId={paymentMethod}
      onSelectPaymentMethod={(id) => setPaymentMethod(id as "FLOW" | "UTC" | "USD")}
    >
      <ShipPurchaseInterface
        onClose={goToManageNavy}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
      />
    </ShipPurchasePanel>
  );
}
