"use client";

import React from "react";
import { toast } from "react-hot-toast";
import { useOwnedShipsWeb2 } from "../hooks/useOwnedShipsWeb2";
import { useShipAttributesByIdsWeb2 } from "../hooks/useShipAttributesByIdsWeb2";
import { useFleetPlacementWeb2 } from "../hooks/useFleetPlacementWeb2";
import { useNavyFilterState } from "../hooks/useNavyFilterState";
import { useRoguelikeCampaignWeb2, useRoguelikeMatchWeb2 } from "../hooks/useRoguelikeWeb2";
import { buildFleetShipListItemsWeb2 } from "../utils/buildFleetShipListItemsWeb2";
import {
  navyFilterSecondaryOptionsWeb2,
  filterAndSortShipsWeb2,
} from "../utils/navyFiltersWeb2";
import type { NavyFilterCategory } from "../utils/navyFilters";
import { FleetShipListPanel } from "./FleetShipListPanel";
import { NavyFilterToolbar } from "./NavyFilterToolbar";
import { ManageNavyShipsCountHeading } from "./ManageNavyShipsCountHeading";
import { NavyPagination } from "./NavyPagination";

const SHIPS_PER_PAGE = 100;

const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1;

interface RoguelikeRunStartWeb2Props {
  onRunStarted: () => void;
}

// Web2 counterpart to RoguelikeRunStart.tsx — the literal same ship cards
// (buildFleetShipListItemsWeb2/ShipCard) and the same Manage Navy filter/
// sort toolbar (useNavyFilterState/NavyFilterToolbar/filterAndSortShipsWeb2),
// only the data source (useOwnedShipsWeb2/useRoguelikeCampaignWeb2) and
// write mutation (useRoguelikeMatchWeb2) differ.
export function RoguelikeRunStartWeb2({ onRunStarted }: RoguelikeRunStartWeb2Props) {
  const { startRun } = useRoguelikeMatchWeb2();
  const [isStarting, setIsStarting] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  const { ships, isLoading: shipsLoading } = useOwnedShipsWeb2();
  const { campaign } = useRoguelikeCampaignWeb2(DEFAULT_ROGUELIKE_CAMPAIGN_ID);

  const requiredVariant = campaign?.requiredVariant ?? 0;
  const costLimit = campaign?.initialCostCap ?? 0;

  const fleet = useFleetPlacementWeb2({
    ships,
    costLimit,
    costsVersion: null,
    isCreatorSide: true,
    requiredVariant,
  });

  const variantScopedShips = React.useMemo(
    () =>
      fleet.lockedVariant != null
        ? fleet.ships.filter((s) => s.traits.variant === fleet.lockedVariant)
        : fleet.ships,
    [fleet.ships, fleet.lockedVariant],
  );

  const filterState = useNavyFilterState(SHIPS_PER_PAGE);
  const getNavyFilterSecondaryOptions = React.useCallback(
    (category: NavyFilterCategory) => navyFilterSecondaryOptionsWeb2(category, variantScopedShips),
    [variantScopedShips],
  );

  const filteredAndSortedShips = React.useMemo(
    () =>
      filterAndSortShipsWeb2(
        variantScopedShips,
        filterState.activeFilters,
        filterState.sortBy,
        filterState.sortOrder,
        new Set(),
      ),
    [variantScopedShips, filterState.activeFilters, filterState.sortBy, filterState.sortOrder],
  );
  const paginatedShips = React.useMemo(
    () => filterState.paginate(filteredAndSortedShips),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredAndSortedShips, filterState.page],
  );

  const shipIdsForAttributes = React.useMemo(() => fleet.ships.map((s) => s.id), [fleet.ships]);
  const { attributesByShipId, isLoading: attributesLoading } =
    useShipAttributesByIdsWeb2(shipIdsForAttributes);

  const shipListItems = buildFleetShipListItemsWeb2({
    ships: paginatedShips,
    selectedShips: fleet.selectedShips,
    addShip: fleet.addShip,
    removeShip: fleet.removeShip,
    setDraggedShipId: fleet.setDraggedShipId,
    setDragOverPosition: fleet.setDragOverPosition,
    attributesMap: attributesByShipId,
    attributesLoading,
    showInGameProperties,
    flipShips: false,
  });

  const isOverCap = fleet.totalCost > costLimit && costLimit > 0;

  const handleStartRun = async () => {
    if (fleet.selectedShips.length === 0) {
      toast.error("Select at least one ship for your roster");
      return;
    }
    if (isOverCap) {
      toast.error(`Roster cost exceeds this campaign's ${costLimit} limit.`);
      return;
    }
    setIsStarting(true);
    try {
      await startRun(DEFAULT_ROGUELIKE_CAMPAIGN_ID, fleet.selectedShips);
      toast.success("Run started!");
      onRunStarted();
    } catch (error) {
      console.error("Failed to start run:", error);
      toast.error(error instanceof Error ? error.message : "Failed to start run");
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div>
        <h3 className="text-xl font-bold text-cyan">[ROGUELIKE CAMPAIGN]</h3>
        <p className="mt-2 text-sm text-text-secondary">
          Commit a roster once — it persists (with accumulated hull damage)
          across every mission until the run ends. Branching paths lock out
          their siblings once you commit to one, so choose carefully.
        </p>
        {!!requiredVariant && (
          <div className="mt-2 inline-flex w-fit items-center gap-1.5 border border-amber/40 bg-amber/10 px-2 py-1 text-[10px] uppercase tracking-wider text-amber">
            Requires Faction {requiredVariant} fleet
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
        <span>
          Roster cost:{" "}
          <span className={isOverCap ? "text-warning-red" : "text-cyan"}>
            {fleet.totalCost}
          </span>
          {costLimit > 0 && <span> / {costLimit}</span>}
        </span>
        <span>Selected: {fleet.selectedShips.length}</span>
      </div>

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
            getSecondaryOptions={getNavyFilterSecondaryOptions}
            onSelectCategory={(category) =>
              filterState.selectDraftCategory(category, getNavyFilterSecondaryOptions)
            }
            onToggleFilterValue={filterState.toggleFilterValue}
            onSetThreatFilter={filterState.setThreatFilter}
            onSetDraftValue={filterState.setDraftValue}
          />

          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-4">
            <label className="flex min-w-0 cursor-pointer items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={showInGameProperties}
                onChange={(e) => setShowInGameProperties(e.target.checked)}
              />
              <span className="truncate text-text-secondary">Show in-game stats</span>
            </label>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
        <ManageNavyShipsCountHeading
          shownCount={filteredAndSortedShips.length}
          totalCount={fleet.ships.length}
          perPage={SHIPS_PER_PAGE}
          page={filterState.page}
        />
        {filteredAndSortedShips.length > SHIPS_PER_PAGE && (
          <NavyPagination
            page={filterState.page}
            pageCount={filterState.pageCount(filteredAndSortedShips.length)}
            onPrev={filterState.prevPage}
            onNext={() => filterState.nextPage(filteredAndSortedShips.length)}
          />
        )}
      </div>

      {shipsLoading ? (
        <p className="text-sm text-text-muted">Loading your ships…</p>
      ) : (
        <FleetShipListPanel
          widthClass="w-full"
          items={shipListItems}
          gridColsClassName="grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2 lg:grid-cols-3"
        />
      )}

      <button
        type="button"
        onClick={() => void handleStartRun()}
        disabled={isStarting || fleet.selectedShips.length === 0 || isOverCap}
        className="self-start border-2 border-phosphor-green px-6 py-3 text-sm font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-40"
        style={{ borderRadius: 0 }}
      >
        {isStarting ? "[STARTING RUN...]" : `[START RUN (${fleet.selectedShips.length})]`}
      </button>
    </div>
  );
}
