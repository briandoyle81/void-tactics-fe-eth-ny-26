"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import { useUtcPurchaseTiersAdminWeb2 } from "../hooks/useUtcPurchaseWeb2";
import type { PurchaseTier } from "../lib/purchaseTiers";
import type { UtcPurchaseTier } from "../lib/utcPurchaseTiers";
import { PurchaseTierTable, type PurchaseTierRowData } from "./PurchaseTierTable";
import { ShipPurchasePricesHeaderCard } from "./ShipPurchasePricesHeaderCard";
import { ShipPurchaseTierSectionCard } from "./ShipPurchaseTierSectionCard";

// Web2-mode counterpart to `ShipPurchasePrices.tsx` — same tier-table
// editing UX, but for DB-backed Config rows (via getPurchaseTiers.ts /
// getUtcPurchaseTiers.ts) instead of the Ships/ShipPurchaser contracts'
// setPurchaseInfo. Gated on `useWeb2Admin()` (WEB2_ADMIN_EMAILS) instead of
// contract ownership.
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

  // Tool 3 — direct UTC purchase tiers, independent Config row/API from the
  // ship-pack tiers above (see useUtcPurchaseWeb2.ts / /api/utc/purchase-tiers).
  const {
    tiers: utcTiers,
    isLoading: isUtcLoading,
    refetch: refetchUtc,
  } = useUtcPurchaseTiersAdminWeb2();
  const [utcDraft, setUtcDraft] = useState<UtcPurchaseTier[]>(utcTiers);
  const [isUtcSaving, setIsUtcSaving] = useState(false);
  const [isUtcDirty, setIsUtcDirty] = useState(false);
  useEffect(() => {
    if (!isUtcDirty) setUtcDraft(utcTiers);
  }, [utcTiers, isUtcDirty]);

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

  const updateUtcRow = (index: number, patch: Partial<UtcPurchaseTier>) => {
    setIsUtcDirty(true);
    setUtcDraft((prev) =>
      prev.map((t, i) => (i === index ? { ...t, ...patch } : t)),
    );
  };

  const handleUtcReset = () => {
    setUtcDraft(utcTiers);
    setIsUtcDirty(false);
    toast.success("Reset to last saved values.");
  };

  const handleUtcSave = async () => {
    setIsUtcSaving(true);
    try {
      await apiMutate("/api/utc/purchase-tiers", "PUT", utcDraft);
      toast.success("UTC purchase tiers updated");
      setIsUtcDirty(false);
      refetchUtc();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to update tiers");
    } finally {
      setIsUtcSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <ShipPurchasePricesHeaderCard
        title="Ship pack & UTC purchase prices"
        description={
          <>
            Web2-mode tiers, stored in the app database. Three purchase
            flows, two independent Config rows:{" "}
            <span className="text-text-secondary">
              Tools 1 &amp; 2 — ship packs paid in tokens (USD) or UTC
            </span>{" "}
            (Config key{" "}
            <span className="text-text-secondary">purchase_tiers</span>,
            via{" "}
            <span className="text-text-secondary">/api/ships/purchase/usd</span>{" "}
            and{" "}
            <span className="text-text-secondary">/api/ships/purchase/utc</span>
            ), and{" "}
            <span className="text-text-secondary">
              Tool 3 — UTC packs paid in tokens (USD)
            </span>{" "}
            (Config key{" "}
            <span className="text-text-secondary">utc_purchase_tiers</span>,
            via{" "}
            <span className="text-text-secondary">/api/utc/purchase</span>
            ), edited separately below.
          </>
        }
        hasUnsavedChanges={isDirty || isUtcDirty}
        unsavedChangesLabel="Unsaved changes."
      />

      <ShipPurchaseTierSectionCard
        title="Tools 1 & 2 — Ship packs, priced in tokens (USD) & UTC"
        subtitle="Each row is one purchasable ship pack. Ship count and both prices save together in one action."
        isLoading={isLoading}
        isEmpty={draft.length === 0}
        belowSubtitle={
          <p className="text-warning-red/90 text-xs font-mono">
            Note: it is unusual to change the UTC column&apos;s prices unless
            you are running a sale.
          </p>
        }
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
                currencyLabel: "USD (Tool 1)",
                value: (t.priceUsdCents / 100).toFixed(2),
                onChange: (value) =>
                  updateRow(i, {
                    priceUsdCents: Math.round((Number(value) || 0) * 100),
                  }),
              },
              {
                currencyLabel: "UTC (Tool 2)",
                value: String(t.priceUtc),
                onChange: (value) =>
                  updateRow(i, { priceUtc: Number(value) || 0 }),
              },
            ],
          }))}
        />
      </ShipPurchaseTierSectionCard>

      <ShipPurchaseTierSectionCard
        title="Tool 3 — UTC packs, priced in tokens (USD)"
        subtitle="Each row is a direct UTC purchase — independent from the ship-pack tiers above. This is what UTCPurchaseModalWeb2 shows."
        isLoading={isUtcLoading}
        isEmpty={utcDraft.length === 0}
        footer={
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={handleUtcSave}
              disabled={isUtcSaving || !isUtcDirty}
              className="px-4 py-2 rounded-none border-2 text-cyan font-mono font-bold text-sm tracking-wider transition-colors hover:bg-cyan/10 disabled:opacity-50"
              style={{ borderColor: "var(--color-cyan)" }}
            >
              {isUtcSaving ? "[SAVING…]" : "[SAVE UTC PACKS]"}
            </button>
            <button
              type="button"
              onClick={handleUtcReset}
              disabled={!isUtcDirty}
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
          quantityLabel="UTC / pack"
          rows={utcDraft.map((t, i): PurchaseTierRowData => ({
            tierLabel: String(t.tier),
            shipCount: t.utcAmount,
            onShipCountChange: (value) => updateUtcRow(i, { utcAmount: value }),
            prices: [
              {
                currencyLabel: "USD",
                value: (t.priceUsdCents / 100).toFixed(2),
                onChange: (value) =>
                  updateUtcRow(i, {
                    priceUsdCents: Math.round((Number(value) || 0) * 100),
                  }),
              },
            ],
          }))}
        />
      </ShipPurchaseTierSectionCard>
    </div>
  );
};

export default ShipPurchasePricesWeb2;
