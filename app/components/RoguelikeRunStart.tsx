"use client";

import React from "react";
import { useAccount } from "wagmi";
import { baseSepolia } from "viem/chains";
import { toast } from "react-hot-toast";
import { useOwnedShips } from "../hooks/useOwnedShips";
import { useFleetShipAttributes } from "../hooks/useFleetShipAttributes";
import { useFleetPlacement } from "../hooks/useFleetPlacement";
import { useNavyFilterState } from "../hooks/useNavyFilterState";
import { useRoguelikeMatch } from "../hooks/useRoguelikeMatch";
import {
  useRoguelikeCampaignInitialCostCap,
  useRoguelikeCampaignRequiredVariant,
} from "../hooks/useRoguelikeNodeMap";
import { buildFleetShipListItems } from "../utils/buildFleetShipListItems";
import {
  filterAndSortShips,
  navyFilterSecondaryOptions,
  type NavyFilterCategory,
} from "../utils/navyFilters";
import { FleetShipListPanel } from "./FleetShipListPanel";
import { NavyFilterToolbar } from "./NavyFilterToolbar";
import { ManageNavyShipsCountHeading } from "./ManageNavyShipsCountHeading";
import { NavyPagination } from "./NavyPagination";

const SHIPS_PER_PAGE = 100;

// Only campaign 1 exists today — same "default to 1, no real picker until a
// second campaign exists" approach as NodeMapAdminPanel.tsx takes for the
// original campaign system.
const DEFAULT_ROGUELIKE_CAMPAIGN_ID = 1n;

interface RoguelikeRunStartProps {
  onRunStarted: () => void;
}

// "No active run" landing state: pick a roster (single variant, no per-
// mission reselection — the whole roster fights every combat node in the
// run), then RoguelikeMatch.startRun. Same ship cards as regular fleet
// selection (Lobbies.tsx/NodeMatchModal — ShipCard via
// buildFleetShipListItems, in-game properties included) and the same
// filter/sort toolbar as Manage Navy (useNavyFilterState/NavyFilterToolbar/
// filterAndSortShips), not the simpler FleetFilterPanel fleetFilters.ts
// uses elsewhere in fleet-selection flows.
export function RoguelikeRunStart({ onRunStarted }: RoguelikeRunStartProps) {
  const { address } = useAccount();
  const { startRun } = useRoguelikeMatch();
  const [isStarting, setIsStarting] = React.useState(false);
  const [showInGameProperties, setShowInGameProperties] = React.useState(true);

  const { ships, isLoading: shipsLoading } = useOwnedShips(baseSepolia.id);

  const { data: requiredVariant } = useRoguelikeCampaignRequiredVariant(
    DEFAULT_ROGUELIKE_CAMPAIGN_ID,
  );
  const { data: initialCostCap } = useRoguelikeCampaignInitialCostCap(
    DEFAULT_ROGUELIKE_CAMPAIGN_ID,
  );
  const costLimit = initialCostCap != null ? Number(initialCostCap) : 0;

  // costsVersion staleness isn't checked here (no cost-limit action changes
  // based on it at this step) — costsVersion: null skips that check, same
  // opt-out useFleetPlacement already supports.
  const fleet = useFleetPlacement({
    ships,
    costLimit,
    costsVersion: null,
    isCreatorSide: true,
    requiredVariant,
  });

  // useFleetPlacement's own filteredShips applies fleetFilters.ts filtering
  // (the simpler set) — deliberately unused here. Variant-locking still
  // comes from the hook (fleet.lockedVariant), but display filtering/
  // sorting is Manage Navy's system instead.
  const variantScopedShips = React.useMemo(
    () =>
      fleet.lockedVariant != null
        ? fleet.ships.filter((s) => s.traits.variant === fleet.lockedVariant)
        : fleet.ships,
    [fleet.ships, fleet.lockedVariant],
  );

  const filterState = useNavyFilterState(SHIPS_PER_PAGE);
  const getNavyFilterSecondaryOptions = React.useCallback(
    (category: NavyFilterCategory) => navyFilterSecondaryOptions(category, variantScopedShips),
    [variantScopedShips],
  );

  const filteredAndSortedShips = React.useMemo(
    () =>
      filterAndSortShips(
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
    // filterState is a fresh object every render; depend on the specific
    // stable member actually used, not the whole object.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filteredAndSortedShips, filterState.page],
  );

  const shipIdsForAttributes = React.useMemo(() => fleet.ships.map((s) => s.id), [fleet.ships]);
  const { attributesMap, attributesLoading } = useFleetShipAttributes(
    shipIdsForAttributes,
    baseSepolia.id,
  );

  const shipListItems = buildFleetShipListItems({
    ships: paginatedShips,
    selectedShips: fleet.selectedShips,
    addShip: fleet.addShip,
    removeShip: fleet.removeShip,
    setDraggedShipId: fleet.setDraggedShipId,
    setDragOverPosition: fleet.setDragOverPosition,
    attributesMap,
    attributesLoading,
    showInGameProperties,
    flipShips: false,
  });

  const isOverCap = fleet.totalCost > costLimit && costLimit > 0;

  const handleStartRun = async () => {
    if (!address) {
      toast.error("Please connect your wallet");
      return;
    }
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
      const message = error instanceof Error ? error.message : String(error);
      if (message.includes("EmptyRoster")) {
        toast.error("Select at least one ship for your roster");
      } else if (message.includes("WrongCampaignVariant")) {
        toast.error("This campaign requires a different faction's fleet.");
      } else if (message.includes("RunAlreadyActive")) {
        toast.error("You already have a run in progress.");
      } else if (message.includes("CampaignNotFound") || message.includes("CampaignHasNoRoot")) {
        toast.error("This campaign isn't set up yet.");
      } else if (message.includes("User rejected") || message.includes("User denied")) {
        toast.error("Transaction declined by user");
      } else {
        toast.error(`Failed to start run: ${message}`);
      }
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-2 border-cyan p-6 font-mono" style={{ borderRadius: 0 }}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
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

        <button
          type="button"
          onClick={() => void handleStartRun()}
          disabled={isStarting || fleet.selectedShips.length === 0 || isOverCap}
          className="shrink-0 self-start border-2 border-phosphor-green px-6 py-3 text-sm font-bold uppercase tracking-wider text-phosphor-green transition-colors hover:bg-phosphor-green/10 disabled:cursor-not-allowed disabled:opacity-40"
          style={{ borderRadius: 0 }}
        >
          {isStarting ? "[STARTING RUN...]" : `[START RUN (${fleet.selectedShips.length})]`}
        </button>
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
    </div>
  );
}
