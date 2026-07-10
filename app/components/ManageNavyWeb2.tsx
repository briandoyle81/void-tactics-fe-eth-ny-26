"use client";

import React, { useCallback, useMemo, useState } from "react";
import { toast } from "react-hot-toast";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { useCurrentUser } from "../hooks/useCurrentUser";
import { Web2Ship } from "../types/web2Ship";
import { apiMutate } from "../lib/apiMutate";
import ShipCard from "./ShipCard";
import { ShipImageWeb2 } from "./ShipImageWeb2";
import { toShipCardDataWeb2 } from "../utils/toShipCardDataWeb2";
import { ShipPurchaseInterfaceWeb2 } from "./ShipPurchaseInterfaceWeb2";
import { ShipPurchasePanel } from "./ShipPurchasePanel";
import { navyFilterSecondaryOptionsWeb2, filterAndSortShipsWeb2 } from "../utils/navyFiltersWeb2";
import { useNavyFilterState } from "../hooks/useNavyFilterState";
import { useStarredShips } from "../hooks/useStarredShips";
import { useFleetComposition } from "../hooks/useFleetComposition";
import { reorderByFleetComposition } from "../utils/fleetCompositionStorage";
import { NavyFilterToolbar } from "./NavyFilterToolbar";
import { NavyPagination } from "./NavyPagination";
import { FleetCompositionSelect } from "./FleetCompositionSelect";
import { FleetCompositionControls } from "./FleetCompositionControls";
import { FleetCompositionLocalNoticeModal } from "./FleetCompositionLocalNoticeModal";
import { FleetCompositionCardControls } from "./FleetCompositionCardControls";
import { RecycleConfirmModal } from "./RecycleConfirmModal";
import { RecycleConfirmButtonWeb2 } from "./RecycleConfirmButtonWeb2";
import { useRecycleEligibilityWeb2 } from "../hooks/useRecycleEligibilityWeb2";

// Web2's fleet-composition export/import compatibility tag — there's no
// "chain" concept in web2, so this is a fixed constant (any web2 export can
// be imported by any web2 user; see fleetCompositionStorage.ts).
const FLEET_COMPOSITION_SCOPE_TAG = "web2";

// Web2-mode counterpart to `ManageNavy.tsx`. Ships-UI slice for web2 —
// list, purchase (USD/UTC), construct (single/all), recycle (single/bulk),
// claim-free, plus filters/sort/pagination/starring sharing UI with web3's
// `ManageNavy.tsx` (NavyFilterToolbar/NavyPagination/useNavyFilterState/
// useStarredShips, see app/utils/navyFiltersWeb2.ts). Fleet-composition
// presets are still web3-only — see the ManageNavyWeb2-parity plan for
// what's still open.
//
// Note: the USD purchase route has no real payment gate on the branch this
// was ported from (no Stripe/checkout integration exists) — it grants ships
// directly. Treat it as a placeholder until a real payment step is added.

const SHIPS_PER_PAGE = 100;

const ManageNavyWeb2: React.FC = () => {
  const { ships, isLoading, error, refetch } = useOwnedShipsWeb2();
  const { userId } = useCurrentUser();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [busy, setBusy] = useState(false);
  const [showShipPurchase, setShowShipPurchase] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"usd" | "utc">("usd");
  const [showRecycleModal, setShowRecycleModal] = useState(false);
  const [shipToRecycle, setShipToRecycle] = useState<Web2Ship | null>(null);
  const filterState = useNavyFilterState(SHIPS_PER_PAGE);
  const { starredShips, toggleStar } = useStarredShips(userId ?? "");
  const recycleEligibility = useRecycleEligibilityWeb2();

  const getSecondaryOptions = useCallback(
    (category: Parameters<typeof navyFilterSecondaryOptionsWeb2>[0]) =>
      navyFilterSecondaryOptionsWeb2(category, ships),
    [ships],
  );

  const filteredAndSortedShips = useMemo(
    () =>
      filterAndSortShipsWeb2(
        ships,
        filterState.activeFilters,
        filterState.sortBy,
        filterState.sortOrder,
        starredShips,
      ),
    [ships, filterState.activeFilters, filterState.sortBy, filterState.sortOrder, starredShips],
  );

  // validShipIds: alive + constructed ships eligible for a fleet preset.
  // `null` while ships are still loading, so auto-prune doesn't strip
  // presets just because the ship list is momentarily empty.
  const validFleetCompositionShipIds = useMemo(
    () =>
      isLoading
        ? null
        : new Set(
            ships
              .filter((s) => s.shipData.constructed && s.shipData.timestampDestroyed === 0)
              .map((s) => String(s.id)),
          ),
    [ships, isLoading],
  );
  const fleetComposition = useFleetComposition(
    userId ?? "",
    FLEET_COMPOSITION_SCOPE_TAG,
    validFleetCompositionShipIds,
  );

  const shipsForGridDisplay = useMemo(
    () =>
      reorderByFleetComposition(filteredAndSortedShips, fleetComposition.activeFleet, (s) =>
        String(s.id),
      ),
    [filteredAndSortedShips, fleetComposition.activeFleet],
  );

  // Threat total is web2-native: `shipData.cost` is already a number, so no
  // bigint conversion boundary is needed here (unlike ManageNavy.tsx).
  const activeCompositionThreatTotal = useMemo(() => {
    if (!fleetComposition.activeFleet) return 0;
    return fleetComposition.activeFleet.shipIds.reduce((sum, id) => {
      const s = ships.find((x) => String(x.id) === id);
      if (!s || !s.shipData.constructed || s.shipData.timestampDestroyed > 0) {
        return sum;
      }
      return sum + s.shipData.cost;
    }, 0);
  }, [fleetComposition.activeFleet, ships]);

  const paginatedShips = useMemo(
    () => filterState.paginate(shipsForGridDisplay),
    // filterState is a fresh object every render; depend on the specific
    // stable members actually used, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [shipsForGridDisplay, filterState.page, filterState.paginate],
  );

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

  const handleConstructAll = () =>
    runAction("construct ships", async () => {
      const result = await apiMutate<{ constructed: number }>("/api/ships/construct", "POST", { all: true });
      toast.success(`Constructed ${result.constructed} ship(s)`);
    });

  const handleRecycleClick = (ship: Web2Ship) => {
    setShipToRecycle(ship);
    setShowRecycleModal(true);
  };

  const handleRecycleCancel = () => {
    setShowRecycleModal(false);
  };

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
      setShowShipPurchase(false);
    });

  const recyclableSelectedCount = Array.from(selected).filter((id) => {
    const ship = ships.find((s) => s.id === id);
    return ship && !ship.shipData.inFleet && !ship.shipData.isFree;
  }).length;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-mono text-lg font-bold uppercase tracking-wider text-text-primary">
          [YOUR SHIPS] — Showing{" "}
          {filteredAndSortedShips.length > SHIPS_PER_PAGE
            ? `${filterState.page * SHIPS_PER_PAGE + 1}–${Math.min(
                (filterState.page + 1) * SHIPS_PER_PAGE,
                filteredAndSortedShips.length,
              )} of ${filteredAndSortedShips.length}`
            : filteredAndSortedShips.length}{" "}
          of {ships.length} ships
        </h2>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setShowShipPurchase((v) => !v)}
            disabled={busy}
            className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
            style={{ borderColor: "var(--color-cyan)", color: "var(--color-cyan)", borderRadius: 0 }}
          >
            Buy New Ships
          </button>
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
          {selected.size > 0 && recycleEligibility.canRecycle && (
            <button
              onClick={handleRecycleSelected}
              disabled={busy || recyclableSelectedCount === 0}
              className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid disabled:opacity-40"
              style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
            >
              Recycle {recyclableSelectedCount} Selected
            </button>
          )}
          {selected.size > 0 && !recycleEligibility.canRecycle && (
            <span
              className="px-3 py-1.5 text-xs font-mono font-bold uppercase tracking-wider border-2 border-solid opacity-50"
              style={{ borderColor: "var(--color-warning-red)", color: "var(--color-warning-red)", borderRadius: 0 }}
              title={`Unlocks after ${recycleEligibility.threshold} ship purchases`}
            >
              Recycle — Locked ({recycleEligibility.purchasedShipCount}/{recycleEligibility.threshold})
            </span>
          )}
        </div>
      </div>

      <ShipPurchasePanel
        show={showShipPurchase}
        onClose={() => setShowShipPurchase(false)}
        paymentMethods={[
          { id: "usd", label: "USD", activeBorderClass: "border-phosphor-green", activeTextClass: "text-phosphor-green", activeBgClass: "bg-phosphor-green/10" },
          { id: "utc", label: "UTC", activeBorderClass: "border-amber", activeTextClass: "text-amber", activeBgClass: "bg-amber/10" },
        ]}
        activePaymentMethodId={paymentMethod}
        onSelectPaymentMethod={(id) => setPaymentMethod(id as "usd" | "utc")}
      >
        <ShipPurchaseInterfaceWeb2
          paymentMethod={paymentMethod}
          onPurchase={handlePurchase}
          busy={busy}
        />
      </ShipPurchasePanel>

      {isLoading && <div className="font-mono text-sm text-text-muted">Loading ships…</div>}
      {error && <div className="font-mono text-sm text-warning-red">{error}</div>}

      {!isLoading && ships.length === 0 && (
        <div className="font-mono text-sm text-text-muted">
          No ships yet — claim your free ships or purchase a pack above.
        </div>
      )}

      {ships.length > 0 && (
        <div
          className="border border-solid p-3 sm:p-4"
          style={{
            backgroundColor: "var(--color-slate)",
            borderColor: "var(--color-gunmetal)",
            borderTopColor: "var(--color-steel)",
            borderLeftColor: "var(--color-steel)",
            borderRadius: 0,
          }}
        >
          <div className="flex flex-col gap-4 xl:flex-row xl:flex-wrap xl:items-center xl:justify-between">
            <FleetCompositionSelect
              fleetCompositions={fleetComposition.fleetCompositions}
              selectedId={fleetComposition.selectedId}
              onChange={fleetComposition.onSelectChange}
            />
            <NavyFilterToolbar
              activeFilters={filterState.activeFilters}
              onRemoveFilter={filterState.removeFilterById}
              onClearFilters={filterState.clearFilters}
              sortBy={filterState.sortBy}
              onSortByChange={filterState.setSortBy}
              sortOrder={filterState.sortOrder}
              onToggleSortOrder={() =>
                filterState.setSortOrder(filterState.sortOrder === "asc" ? "desc" : "asc")
              }
              showFilterWindow={filterState.showFilterWindow}
              onOpenFilterWindow={(anchor) => {
                filterState.setFilterWindowAnchor(anchor);
                filterState.setShowFilterWindow(true);
              }}
              onCloseFilterWindow={() => filterState.setShowFilterWindow(false)}
              filterWindowAnchor={filterState.filterWindowAnchor}
              draftCategory={filterState.draftCategory}
              getSecondaryOptions={getSecondaryOptions}
              onSelectCategory={(category) =>
                filterState.selectDraftCategory(category, getSecondaryOptions)
              }
              onToggleFilterValue={filterState.toggleFilterValue}
              onSetThreatFilter={filterState.setThreatFilter}
              onSetDraftValue={filterState.setDraftValue}
            />
          </div>

          <div className="mt-4">
            <FleetCompositionControls
              selectedId={fleetComposition.selectedId}
              activeFleet={fleetComposition.activeFleet}
              renameDraft={fleetComposition.renameDraft}
              onRenameDraftChange={fleetComposition.setRenameDraft}
              onCommitRename={fleetComposition.commitRename}
              renameIsDirty={fleetComposition.renameIsDirty}
              threatTotal={activeCompositionThreatTotal}
              onDeleteActive={fleetComposition.deleteActive}
              fleetCompositions={fleetComposition.fleetCompositions}
              onExport={() => fleetComposition.exportFile("fleet_compositions")}
              importInputRef={fleetComposition.importInputRef}
              onImportFileChange={fleetComposition.onImportFileChange}
            />
          </div>
        </div>
      )}

      <FleetCompositionLocalNoticeModal
        show={fleetComposition.showLocalNoticeModal}
        onCancel={fleetComposition.cancelLocalNoticeModal}
        onAcknowledge={fleetComposition.acknowledgeLocalNoticeModal}
      />

      <RecycleConfirmModal
        show={showRecycleModal && shipToRecycle != null}
        shipName={shipToRecycle ? (shipToRecycle.name || `Ship #${shipToRecycle.id}`) : ""}
        canRecycle={recycleEligibility.canRecycle}
        purchasedCount={recycleEligibility.purchasedShipCount}
        threshold={recycleEligibility.threshold}
        rewardLabel={String(recycleEligibility.rewardUtc)}
        onCancel={handleRecycleCancel}
        confirmButton={
          shipToRecycle && (
            <RecycleConfirmButtonWeb2
              shipId={shipToRecycle.id}
              onSuccess={() => {
                setShowRecycleModal(false);
                setShipToRecycle(null);
                refetch();
                recycleEligibility.refetch();
              }}
            />
          )
        }
      />

      {!isLoading && filteredAndSortedShips.length > SHIPS_PER_PAGE && (
        <div className="flex items-center justify-end gap-2">
          <NavyPagination
            page={filterState.page}
            pageCount={filterState.pageCount(filteredAndSortedShips.length)}
            onPrev={filterState.prevPage}
            onNext={() => filterState.nextPage(filteredAndSortedShips.length)}
          />
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3">
        {paginatedShips.map((ship) => (
          <ShipCard
            key={ship.id}
            ship={toShipCardDataWeb2(ship)}
            shipImage={<ShipImageWeb2 ship={ship} className="h-full w-full" />}
            isStarred={starredShips.has(String(ship.id))}
            onToggleStar={() => toggleStar(String(ship.id))}
            isSelected={selected.has(ship.id)}
            onToggleSelection={() => toggleSelect(ship.id)}
            onRecycleClick={() => handleRecycleClick(ship)}
            showInGameProperties={false}
            fleetCompositionControls={(() => {
              if (!fleetComposition.selectedId || !fleetComposition.activeFleet) {
                return undefined;
              }
              const sid = String(ship.id);
              const destroyed = ship.shipData.timestampDestroyed > 0;
              const inComp = fleetComposition.activeFleet.shipIds.includes(sid);
              if (!ship.shipData.constructed) return undefined;
              if (destroyed && !inComp) return undefined;

              return (
                <FleetCompositionCardControls
                  destroyedAndInComposition={destroyed && inComp}
                  inComposition={inComp}
                  onAdd={() => fleetComposition.addShip(sid)}
                  onRemove={() => fleetComposition.removeShip(sid)}
                />
              );
            })()}
          />
        ))}
      </div>
    </div>
  );
};

export default ManageNavyWeb2;
