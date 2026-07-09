"use client";

import React, { useState, useCallback } from "react";
import { toast } from "react-hot-toast";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { Web2Ship } from "../types/web2Ship";
import { apiMutate } from "../lib/apiMutate";
import { PURCHASE_TIERS } from "../lib/purchaseTiers";
import ShipCardWeb2 from "./ShipCardWeb2";

// Web2-mode counterpart to `ManageNavy.tsx`. This is the first ships-UI
// slice for web2 — list, purchase (USD/UTC), construct (single/all),
// recycle (single/bulk), and claim-free. It deliberately does not attempt
// feature parity with the (much larger, more mature) web3 `ManageNavy.tsx`
// — no filters/sort/fleet-composition/pagination yet. See
// docs/merge-explore-traditional-plan.md for what's still open.
//
// Note: the USD purchase route has no real payment gate on the branch this
// was ported from (no Stripe/checkout integration exists) — it grants ships
// directly. Treat it as a placeholder until a real payment step is added.

const ManageNavyWeb2: React.FC = () => {
  const { ships, isLoading, error, refetch } = useOwnedShipsWeb2();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);

  const toggleSelect = useCallback((id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

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

  const handleConstruct = (ship: Web2Ship) =>
    runAction("construct ship", async () => {
      await apiMutate(`/api/ships/${ship.id}/construct`, "POST");
      toast.success(`${ship.name || `Ship #${ship.id}`} constructed`);
    });

  const handleConstructAll = () =>
    runAction("construct ships", async () => {
      const result = await apiMutate<{ constructed: number }>("/api/ships/construct", "POST", { all: true });
      toast.success(`Constructed ${result.constructed} ship(s)`);
    });

  const handleRecycleOne = (ship: Web2Ship) =>
    runAction("recycle ship", async () => {
      await apiMutate(`/api/ships/${ship.id}`, "DELETE");
      toast.success(`${ship.name || `Ship #${ship.id}`} recycled`);
    });

  const handleRecycleSelected = () =>
    runAction("recycle ships", async () => {
      const result = await apiMutate<{ recycled: number; creditEarned: number }>(
        "/api/ships/recycle",
        "POST",
        { shipIds: Array.from(selected) },
      );
      toast.success(
        `Recycled ${result.recycled} ship(s)${result.creditEarned ? ` (+${result.creditEarned} UTC)` : ""}`,
      );
      setSelected(new Set());
    });

  const handleClaimFree = () =>
    runAction("claim free ships", async () => {
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        "/api/ships/claim-free",
        "POST",
      );
      toast.success(`Claimed ${result.ships.length} free ship(s)`);
    });

  const handlePurchase = (tier: number, currency: "usd" | "utc") =>
    runAction("purchase ships", async () => {
      const result = await apiMutate<{ ships: { id: number; name: string }[] }>(
        `/api/ships/purchase/${currency}`,
        "POST",
        { tier },
      );
      toast.success(`Purchased ${result.ships.length} ship(s)`);
    });

  const recyclableSelectedCount = Array.from(selected).filter((id) => {
    const ship = ships.find((s) => s.id === id);
    return ship && !ship.shipData.inFleet && !ship.shipData.isFree;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-text-primary">
          [YOUR SHIPS] — {ships.length}
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={handleClaimFree}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
          >
            Claim Free Ships
          </button>
          <button
            onClick={handleConstructAll}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-phosphor-green)", color: "var(--color-phosphor-green)", borderRadius: 0 }}
          >
            Construct All
          </button>
          {selected.size > 0 && (
            <button
              onClick={handleRecycleSelected}
              disabled={busy || recyclableSelectedCount === 0}
              className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
              style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
            >
              Recycle {recyclableSelectedCount} Selected
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 border border-solid p-3" style={{ borderColor: "var(--color-gunmetal)" }}>
        {PURCHASE_TIERS.map((t) => (
          <div
            key={t.tier}
            className="flex flex-col gap-1 border border-solid p-2"
            style={{ borderColor: "var(--color-gunmetal)" }}
          >
            <span className="font-mono text-xs text-text-secondary">{t.shipCount} ships</span>
            <div className="flex gap-2">
              <button
                onClick={() => handlePurchase(t.tier, "usd")}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
              >
                ${(t.priceUsdCents / 100).toFixed(2)}
              </button>
              <button
                onClick={() => handlePurchase(t.tier, "utc")}
                disabled={busy}
                className="px-2 py-1 text-[11px] font-mono font-bold uppercase border border-solid disabled:opacity-40"
                style={{ borderColor: "var(--color-amber)", color: "var(--color-amber)", borderRadius: 0 }}
              >
                {t.priceUtc} UTC
              </button>
            </div>
          </div>
        ))}
      </div>

      {isLoading && <div className="font-mono text-sm text-text-muted">Loading ships…</div>}
      {error && <div className="font-mono text-sm text-warning-red">{error}</div>}

      {!isLoading && ships.length === 0 && (
        <div className="font-mono text-sm text-text-muted">
          No ships yet — claim your free ships or purchase a pack above.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
        {ships.map((ship) => (
          <ShipCardWeb2
            key={ship.id}
            ship={ship}
            isSelected={selected.has(ship.id)}
            onToggleSelect={toggleSelect}
            onConstructClick={handleConstruct}
            onRecycleClick={handleRecycleOne}
            recycleDisabled={busy}
          />
        ))}
      </div>
    </div>
  );
};

export default ManageNavyWeb2;
