"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import type { PurchaseTier } from "../lib/purchaseTiers";
import { PurchaseTierTable, type PurchaseTierRowData } from "./PurchaseTierTable";
import { ShipPurchasePricesHeaderCard } from "./ShipPurchasePricesHeaderCard";
import { ShipPurchaseTierSectionCard } from "./ShipPurchaseTierSectionCard";

// Web2-mode counterpart to `ShipPurchasePrices.tsx` — same tier-table
// editing UX, but for the DB-backed `purchase_tiers` Config row (via
// getPurchaseTiers.ts / PUT /api/ships/purchase-tiers) instead of the
// Ships/ShipPurchaser contracts' setPurchaseInfo. Gated on `useWeb2Admin()`
// (WEB2_ADMIN_EMAILS) instead of contract ownership.
const ShipPurchasePricesWeb2: React.FC = () => {
  const canEdit = useWeb2Admin();
  const { tiers, isLoading, refetch } = usePurchaseTiersWeb2();
  const [draft, setDraft] = useState<PurchaseTier[]>(tiers);
  const [isSaving, setIsSaving] = useState(false);

  // Re-sync the draft whenever the live tier list changes (initial load,
  // or a refetch after a successful save) — but not while the admin is
  // mid-edit, so typing doesn't get clobbered by a background refetch.
  const [isDirty, setIsDirty] = useState(false);
  useEffect(() => {
    if (!isDirty) setDraft(tiers);
  }, [tiers, isDirty]);

  if (!canEdit) {
    return (
      <div className="text-center py-8 space-y-2">
        <p className="text-warning-red">
          Access denied. Only authorized accounts can view this admin tab.
        </p>
      </div>
    );
  }

  const updateRow = (index: number, patch: Partial<PurchaseTier>) => {
    setIsDirty(true);
    setDraft((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  };

  const handleReset = () => {
    setDraft(tiers);
    setIsDirty(false);
    toast.success("Reset to last saved values.");
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await apiMutate("/api/ships/purchase-tiers", "PUT", draft);
      toast.success("Purchase tiers updated");
      setIsDirty(false);
      refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tiers");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ShipPurchasePricesHeaderCard
        description={
          <>
            Web2-mode tiers, stored in the app database (Config key{" "}
            <span className="text-text-secondary">purchase_tiers</span>).
            USD purchases use{" "}
            <span className="text-text-secondary">/api/ships/purchase/usd</span>
            , UTC purchases use{" "}
            <span className="text-text-secondary">/api/ships/purchase/utc</span>.
          </>
        }
        hasUnsavedChanges={isDirty}
        unsavedChangesLabel="Unsaved changes."
      />

      <ShipPurchaseTierSectionCard
        title="Purchase tiers"
        subtitle="Each row is one purchasable ship pack."
        isLoading={isLoading}
        isEmpty={draft.length === 0}
        footer={
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !isDirty}
              className="px-4 py-2 rounded-none border-2 text-cyan font-mono font-bold text-sm tracking-wider transition-colors hover:bg-cyan/10 disabled:opacity-50"
              style={{ borderColor: "var(--color-cyan)" }}
            >
              {isSaving ? "[SAVING…]" : "[SAVE TIERS]"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={!isDirty}
              className="px-4 py-2 rounded-none border-2 text-warning-red font-mono text-xs font-bold uppercase tracking-wider transition-colors hover:bg-warning-red/10 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ borderColor: "var(--color-warning-red)" }}
            >
              [RESET]
            </button>
          </div>
        }
      >
        <PurchaseTierTable
          editable
          rows={draft.map((t, i): PurchaseTierRowData => ({
            tierLabel: String(t.tier),
            shipCount: t.shipCount,
            onShipCountChange: (value) => updateRow(i, { shipCount: value }),
            prices: [
              {
                currencyLabel: "USD",
                value: (t.priceUsdCents / 100).toFixed(2),
                onChange: (value) =>
                  updateRow(i, {
                    priceUsdCents: Math.round((Number(value) || 0) * 100),
                  }),
              },
              {
                currencyLabel: "UTC",
                value: String(t.priceUtc),
                onChange: (value) =>
                  updateRow(i, { priceUtc: Number(value) || 0 }),
              },
            ],
          }))}
        />
      </ShipPurchaseTierSectionCard>
    </div>
  );
};

export default ShipPurchasePricesWeb2;
