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
import { RecycleConfirmModal } from "./RecycleConfirmModal";
import { RecycleConfirmButtonWeb2 } from "./RecycleConfirmButtonWeb2";
import { RecycleLockedNotice } from "./RecycleLockedNotice";
import { useRecycleEligibilityWeb2 } from "../hooks/useRecycleEligibilityWeb2";
import { ManageNavyActionButton } from "./ManageNavyActionButton";
import { ManageNavyShipsCountHeading } from "./ManageNavyShipsCountHeading";
import { ManageNavyFleetCompositionCardSlot } from "./ManageNavyFleetCompositionCardSlot";
import { ClaimFreeShipsControls } from "./ClaimFreeShipsControls";
import { ClaimFreeButtonWeb2 } from "./ClaimFreeButtonWeb2";
import { useClaimFreeEligibilityWeb2 } from "../hooks/useClaimFreeEligibilityWeb2";
import { useInvalidateUserBalanceWeb2, useUserBalanceWeb2 } from "../hooks/useUserBalanceWeb2";
import { usePurchaseTiersWeb2 } from "../hooks/usePurchaseTiersWeb2";
import { MockPurchaseConfirmModal } from "./MockPurchaseConfirmModal";

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
  const claimFreeEligibility = useClaimFreeEligibilityWeb2();
  const invalidateBalance = useInvalidateUserBalanceWeb2();
  const { creditBalance } = useUserBalanceWeb2();
  const { tiers: purchaseTiers } = usePurchaseTiersWeb2();
  const recycleEligibility = useRecycleEligibilityWeb2();
  const [pendingShipPurchase, setPendingShipPurchase] = useState<{
    tier: number;
    currency: "usd" | "utc";
  } | null>(null);

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
      if (result.creditEarned) invalidateBalance();
    });

  // Ship purchases have no real payment gate (see the doc comment at the top
  // of this file) and previously executed immediately on tier click with no
  // confirmation step — MockPurchaseConfirmModal inserts one so the flow
  // feels like a real checkout. `handleRequestShipPurchase` (passed as
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
      setShowShipPurchase(false);
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

  const recyclableSelectedCount = Array.from(selected).filter((id) => {
    const ship = ships.find((s) => s.id === id);
    return ship && !ship.shipData.inFleet && !ship.shipData.isFree;
  }).length;

  // Matches web3 ManageNavy.tsx's `fleetStats.unconstructedShips === 0` gate.
  const hasUnconstructedShips = ships.some((s) => !s.shipData.constructed);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ManageNavyShipsCountHeading
          shownCount={filteredAndSortedShips.length}
          totalCount={ships.length}
          perPage={SHIPS_PER_PAGE}
          page={filterState.page}
        />
      </div>

      <div className="relative isolate mb-2 flex w-full flex-col items-stretch justify-center gap-4 overflow-visible md:flex-row md:flex-wrap md:items-center">
        <div className="relative z-10 flex w-full shrink-0 flex-col gap-3 md:flex-row md:flex-nowrap md:items-center md:gap-3 md:w-auto">
          <ManageNavyActionButton
            variant="green"
            onClick={handleConstructAll}
            disabled={busy || !hasUnconstructedShips}
          >
            [CONSTRUCT ALL SHIPS]
          </ManageNavyActionButton>

          <ManageNavyActionButton
            variant="cyan"
            onClick={() => setShowShipPurchase((v) => !v)}
            disabled={busy}
          >
            [BUY NEW SHIPS]
          </ManageNavyActionButton>

          <ClaimFreeShipsControls
            isLoadingClaimStatus={claimFreeEligibility.isLoadingClaimStatus}
            error={claimFreeEligibility.claimStatusError}
            isEligible={claimFreeEligibility.isEligible}
            nextClaimInFormatted={claimFreeEligibility.nextClaimInFormatted}
            claimButton={
              <ClaimFreeButtonWeb2
                onSuccess={() => {
                  refetch();
                  claimFreeEligibility.refetch();
                }}
              />
            }
          />
        </div>

        {selected.size > 0 && recycleEligibility.canRecycle && (
          <ManageNavyActionButton
            variant="red"
            onClick={handleRecycleSelected}
            disabled={busy || recyclableSelectedCount === 0}
          >
            {`[RECYCLE ${recyclableSelectedCount} SHIPS]`}
          </ManageNavyActionButton>
        )}
        {selected.size > 0 && !recycleEligibility.canRecycle && (
          <RecycleLockedNotice
            purchasedCount={recycleEligibility.purchasedShipCount}
            threshold={recycleEligibility.threshold}
          />
        )}
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
                invalidateBalance();
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
            fleetCompositionControls={
              <ManageNavyFleetCompositionCardSlot
                fleetComposition={fleetComposition}
                shipId={String(ship.id)}
                constructed={ship.shipData.constructed}
                destroyed={ship.shipData.timestampDestroyed > 0}
              />
            }
          />
        ))}
      </div>
    </div>
  );
};

export default ManageNavyWeb2;
