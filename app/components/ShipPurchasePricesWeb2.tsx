"use client";

import React, { useEffect, useState } from "react";
import { toast } from "react-hot-toast";
import { apiMutate } from "../lib/apiMutate";
import { useWeb2Admin } from "../hooks/useWeb2Admin";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import type { PurchaseTier } from "../lib/purchaseTiers";

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
      <div className="bg-near-black rounded-none p-4 border border-gunmetal">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <h2 className="text-xl font-mono text-text-primary mb-2">
              Ship pack purchase prices
            </h2>
            <p className="text-sm text-text-muted">
              Web2-mode tiers, stored in the app database (Config key{" "}
              <span className="text-text-secondary">purchase_tiers</span>).
              USD purchases use{" "}
              <span className="text-text-secondary">/api/ships/purchase/usd</span>
              , UTC purchases use{" "}
              <span className="text-text-secondary">/api/ships/purchase/utc</span>.
            </p>
            {isDirty && (
              <p className="text-amber text-xs font-mono mt-2">
                Unsaved changes.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="bg-steel rounded-none p-4 border border-gunmetal">
        <h3 className="text-lg font-mono text-text-primary mb-1">
          Purchase tiers
        </h3>
        <p className="text-sm text-text-muted mb-4">
          Each row is one purchasable ship pack.
        </p>
        {isLoading && draft.length === 0 ? (
          <p className="text-text-muted text-sm font-mono">Loading…</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-mono text-left border-collapse">
              <thead>
                <tr className="border-b border-gunmetal text-text-muted">
                  <th className="py-2 pr-4">Tier</th>
                  <th className="py-2 pr-4">Ships / pack</th>
                  <th className="py-2 pr-4">Price (USD)</th>
                  <th className="py-2">Price (UTC)</th>
                </tr>
              </thead>
              <tbody>
                {draft.map((t, i) => (
                  <tr key={t.tier} className="border-b border-gunmetal/80">
                    <td className="py-2 pr-4 text-cyan">{t.tier}</td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        max={255}
                        value={t.shipCount}
                        onChange={(e) =>
                          updateRow(i, {
                            shipCount: Number(e.target.value) || 0,
                          })
                        }
                        className="w-24 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none"
                      />
                    </td>
                    <td className="py-2 pr-4">
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        value={(t.priceUsdCents / 100).toFixed(2)}
                        onChange={(e) =>
                          updateRow(i, {
                            priceUsdCents: Math.round(
                              (Number(e.target.value) || 0) * 100,
                            ),
                          })
                        }
                        className="w-28 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none"
                      />
                    </td>
                    <td className="py-2">
                      <input
                        type="number"
                        min={0}
                        value={t.priceUtc}
                        onChange={(e) =>
                          updateRow(i, {
                            priceUtc: Number(e.target.value) || 0,
                          })
                        }
                        className="w-28 px-2 py-1 bg-near-black border border-gunmetal text-text-primary rounded-none"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
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
      </div>
    </div>
  );
};

export default ShipPurchasePricesWeb2;
