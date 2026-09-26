"use client";

import React, { useCallback, useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { ShipPurchaseInterfaceWeb2 } from "./ShipPurchaseInterfaceWeb2";
import { ShipPurchasePanel } from "./ShipPurchasePanel";
import { MockPurchaseConfirmModal } from "./MockPurchaseConfirmModal";
import {
  useInvalidateUserBalanceWeb2,
  useUserBalanceWeb2,
} from "../hooks/useUserBalanceWeb2";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";

// The "Store" tab (web2) — the ship-pack purchase UI (plus its mock-checkout
// confirmation step) that used to live inline in the Manage Navy tab. Manage
// Navy's [BUY NEW SHIPS] buttons now navigate here
// (void-tactics-navigate-to-store) instead of opening an inline panel.
export default function StoreWeb2() {
  const { refetch } = useOwnedShipsWeb2();
  const invalidateBalance = useInvalidateUserBalanceWeb2();
  const { creditBalance } = useUserBalanceWeb2();
  const { tiers: purchaseTiers } = usePurchaseTiersWeb2();

  const [busy, setBusy] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"usd" | "utc">("usd");
  const [pendingShipPurchase, setPendingShipPurchase] = useState<{
    tier: number;
    currency: "usd" | "utc";
  } | null>(null);

  const runAction = useCallback(
    async (label: string, action: () => Promise<void>) => {
      setBusy(true);
      try {
        await action();
        await refetch();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : `Failed to ${label}`);
      } finally {
        setBusy(false);
      }
    },
    [refetch],
  );

  // Ship purchases have no real payment gate (see ManageNavyWeb2's doc
  // comment) and previously executed immediately on tier click with no
  // confirmation step — MockPurchaseConfirmModal inserts one so the flow feels
  // like a real checkout. `handleRequestShipPurchase` (passed as
  // ShipPurchaseInterfaceWeb2's onPurchase) just opens the confirmation;
  // `executeShipPurchase` is the real purchase call, only run after confirm.
  const executeShipPurchase = (tier: number, currency: "usd" | "utc") =>
    runAction("purchase ships", async () => {
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        `/api/ships/purchase/${currency}`,
        "POST",
        { tier },
      );
      toast.success(`Purchased ${result.ships.length} ship(s)`);
      if (currency === "utc") invalidateBalance();
    });

  const handleRequestShipPurchase = (tier: number, currency: "usd" | "utc") => {
    setPendingShipPurchase({ tier, currency });
  };

  const handleConfirmShipPurchase = async () => {
    if (!pendingShipPurchase) return;
    await executeShipPurchase(pendingShipPurchase.tier, pendingShipPurchase.currency);
    setPendingShipPurchase(null);
  };

  const pendingTierConfig = pendingShipPurchase
    ? purchaseTiers.find((t) => t.tier === pendingShipPurchase.tier)
    : undefined;

  const goToManageNavy = useCallback(() => {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent("void-tactics-navigate-to-manage-navy"));
  }, []);

  return (
    <>
      <ShipPurchasePanel
        show
        onClose={goToManageNavy}
        paymentMethods={[
          { id: "usd", label: "USD", activeBorderClass: "border-phosphor-green", activeTextClass: "text-phosphor-green", activeBgClass: "bg-phosphor-green/10" },
          { id: "utc", label: "UTC", activeBorderClass: "border-amber", activeTextClass: "text-amber", activeBgClass: "bg-amber/10" },
        ]}
        activePaymentMethodId={paymentMethod}
        onSelectPaymentMethod={(id) => setPaymentMethod(id as "usd" | "utc")}
      >
        <ShipPurchaseInterfaceWeb2
          paymentMethod={paymentMethod}
          onPurchase={handleRequestShipPurchase}
          busy={busy}
        />
      </ShipPurchasePanel>

      <MockPurchaseConfirmModal
        show={pendingShipPurchase !== null}
        title="CONFIRM SHIP PURCHASE"
        lineItems={
          pendingTierConfig
            ? [
                { label: "Ships", value: String(pendingTierConfig.shipCount) },
                { label: "Tier", value: `#${pendingTierConfig.tier}` },
              ]
            : []
        }
        totalLabel={
          pendingTierConfig
            ? pendingShipPurchase?.currency === "utc"
              ? `${pendingTierConfig.priceUtc} UTC`
              : `$${(pendingTierConfig.priceUsdCents / 100).toFixed(2)}`
            : ""
        }
        paymentMethod={pendingShipPurchase?.currency ?? "usd"}
        utcBalance={creditBalance}
        utcBalanceAfter={creditBalance - (pendingTierConfig?.priceUtc ?? 0)}
        isProcessing={busy}
        onCancel={() => setPendingShipPurchase(null)}
        onConfirm={() => void handleConfirmShipPurchase()}
      />
    </>
  );
}
