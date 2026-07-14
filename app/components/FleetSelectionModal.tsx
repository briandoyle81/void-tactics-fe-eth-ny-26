"use client";

import type { ReactNode } from "react";
import { FleetFilterPanel } from "./FleetFilterPanel";
import { FleetShipListPanel, type FleetShipListItemData } from "./FleetShipListPanel";
import type { FleetFilters } from "../utils/fleetFilters";

// Shared between Lobbies.tsx (web3) and LobbiesWeb2.tsx (web2) — the full
// fleet-selection modal chrome (header, create/cancel/go-to-games button,
// filter/points/leave/close row, filter overlay, ship-list + map body),
// ported verbatim from Lobbies.tsx (the canonical layout — web2 adapts to
// match, not the other way around). Only genuinely different mechanisms are
// render-props: `mapDisplay` (MapDisplay vs MapDisplayWeb2 are different
// components), `loadFleetMenu` (identical component, different data
// bindings), and `leaveButton` (an on-chain tx button vs a plain REST
// button).
export interface FleetCreateButtonState {
  isBusy: boolean;
  busyLabel: string;
  selectedCount: number;
  maxShips: number;
  isOverLimit: boolean;
  costLimit: number;
  isUnder90Percent: boolean;
  hasMovedShip: boolean;
  hasStaleCosts: boolean;
}

function getCreateButtonLabel(state: FleetCreateButtonState): string {
  if (state.isBusy) return state.busyLabel;
  if (state.selectedCount > state.maxShips) {
    return `MAX ${state.maxShips} SHIPS (${state.selectedCount} SELECTED)`;
  }
  if (state.isOverLimit) return `OVER ${state.costLimit} THREAT LIMIT`;
  if (state.isUnder90Percent) return `NEED ${Math.round(state.costLimit * 0.9)} POINTS`;
  if (!state.hasMovedShip) return "MOVE AT LEAST ONE SHIP FORWARD";
  if (state.hasStaleCosts) return "COST VERSION OUT OF DATE (MANAGE NAVY)";
  return `CREATE FLEET (${state.selectedCount})`;
}

function isCreateButtonDisabled(state: FleetCreateButtonState): boolean {
  return (
    state.selectedCount === 0 ||
    state.isBusy ||
    state.selectedCount > state.maxShips ||
    state.isOverLimit ||
    state.isUnder90Percent ||
    !state.hasMovedShip ||
    state.hasStaleCosts
  );
}

export interface FleetSelectionModalProps {
  participantHasFleet: boolean;
  opponentHasFleet: boolean;
  onGoToGames: () => void;

  createButtonState: FleetCreateButtonState;
  onCreateFleet: () => void;
  onCancel: () => void;

  filtersExpanded: boolean;
  onToggleFilters: () => void;
  loadFleetMenu: ReactNode;
  onClearFleetSelection: () => void;
  isBusy: boolean;
  totalCost: number;
  costLimit: number;
  isOverLimit: boolean;
  isUnder90Percent: boolean;
  leaveButton?: ReactNode;
  onClose: () => void;

  showFirstFleetHint: boolean;

  fleetFilters: FleetFilters;
  onFleetFiltersChange: (updater: (prev: FleetFilters) => FleetFilters) => void;
  shownCount: number;
  totalCount: number;
  showInGameProperties: boolean;
  onToggleInGameProperties: (value: boolean) => void;
  isAttributesFromCache: boolean;

  shipsLoading?: boolean;
  isCreator: boolean;
  shipListItems: FleetShipListItemData[];
  mapDisplay: ReactNode;
}

export function FleetSelectionModal({
  participantHasFleet,
  opponentHasFleet,
  onGoToGames,
  createButtonState,
  onCreateFleet,
  onCancel,
  filtersExpanded,
  onToggleFilters,
  loadFleetMenu,
  onClearFleetSelection,
  isBusy,
  totalCost,
  costLimit,
  isOverLimit,
  isUnder90Percent,
  leaveButton,
  onClose,
  showFirstFleetHint,
  fleetFilters,
  onFleetFiltersChange,
  shownCount,
  totalCount,
  showInGameProperties,
  onToggleInGameProperties,
  isAttributesFromCache,
  shipsLoading,
  isCreator,
  shipListItems,
  mapDisplay,
}: FleetSelectionModalProps) {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[400]">
      <div className="bg-near-black border border-cyan rounded-none p-6 w-[100vw] h-[100vh] flex flex-col">
        <div className="mb-2 grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto_1fr] md:items-center">
          <div className="flex min-w-0 flex-wrap items-center gap-2 sm:gap-3">
            <h4 className="text-lg font-bold text-cyan whitespace-nowrap">
              {participantHasFleet ? "VIEW FLEET" : "SELECT FLEET"}
            </h4>
            {participantHasFleet && (
              <span className="px-3 py-1 text-xs font-bold text-phosphor-green bg-phosphor-green/20 border border-phosphor-green rounded-none whitespace-nowrap">
                FLEET SELECTED
              </span>
            )}
            {participantHasFleet && !opponentHasFleet && (
              <span className="px-3 py-1 text-xs font-bold text-amber bg-amber/10 border border-amber/40 rounded-none whitespace-nowrap">
                WAITING FOR OPPOSING ADMIRAL
              </span>
            )}
          </div>

          <div className="flex w-full flex-col items-stretch gap-2 md:w-auto md:flex-row md:items-center md:justify-center">
            {!participantHasFleet ? (
              <>
                <button
                  onClick={onCreateFleet}
                  disabled={isCreateButtonDisabled(createButtonState)}
                  className="w-full px-4 py-2 rounded-none border-2 border-cyan text-cyan hover:bg-cyan/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  {getCreateButtonLabel(createButtonState)}
                </button>
                <button
                  onClick={() => {
                    if (createButtonState.isBusy) return;
                    onCancel();
                  }}
                  disabled={createButtonState.isBusy}
                  className="w-full px-4 py-2 border border-warning-red text-warning-red rounded-none hover:bg-warning-red/20 disabled:opacity-50 disabled:cursor-not-allowed md:w-auto md:whitespace-nowrap"
                >
                  CANCEL
                </button>
              </>
            ) : opponentHasFleet ? (
              <button
                type="button"
                onClick={onGoToGames}
                className="w-full px-4 py-2 rounded-none border-2 border-phosphor-green text-phosphor-green hover:bg-phosphor-green/10 font-mono font-bold text-sm tracking-wider transition-all duration-200 md:w-auto md:whitespace-nowrap"
              >
                GO TO GAMES
              </button>
            ) : (
              <button
                type="button"
                disabled
                aria-disabled="true"
                className="w-full cursor-not-allowed px-4 py-2 rounded-none border-2 border-gunmetal bg-near-black/40 text-text-muted font-mono font-bold text-sm tracking-wider md:w-auto md:whitespace-nowrap"
              >
                WAITING FOR OPPOSING ADMIRAL
              </button>
            )}
          </div>

          <div className="relative flex flex-wrap items-center justify-start gap-2 sm:justify-end sm:gap-3">
            {/* Filter Button */}
            <button
              onClick={onToggleFilters}
              className="px-2 py-1 text-xs font-bold text-cyan border border-cyan rounded-none hover:text-cyan/80 hover:border-cyan/80 transition-colors"
            >
              FILTERS ▼
            </button>
            {!participantHasFleet && (
              <>
                {loadFleetMenu}
                <button
                  type="button"
                  onClick={onClearFleetSelection}
                  disabled={isBusy}
                  className="px-2 py-1 text-xs font-bold text-text-muted border border-steel rounded-none hover:text-text-secondary hover:border-steel transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  CLEAR FLEET SELECTION
                </button>
              </>
            )}
            {/* Total Points Display */}
            <div
              className={`text-lg font-bold px-3 py-1 rounded-none ${
                isOverLimit
                  ? "text-warning-red bg-warning-red/20 border border-warning-red/30"
                  : isUnder90Percent
                    ? "text-amber bg-amber/20 border border-amber/30"
                    : "text-phosphor-green bg-phosphor-green/20 border border-phosphor-green/30"
              }`}
            >
              {totalCost}/{costLimit}
            </div>
            {/* Leave Lobby Button (in fleet selection modal) - only show if no fleet is selected */}
            {!participantHasFleet && leaveButton}
            {/* Close Button */}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1 text-sm font-bold text-text-muted border border-gunmetal rounded-none hover:text-text-secondary hover:border-steel transition-colors"
            >
              ✕
            </button>
          </div>
        </div>
        {showFirstFleetHint && (
          <p className="text-sm text-amber mb-4">
            {"// Creating your fleet first will make you go first in the game!"}
          </p>
        )}

        {/* Filter Overlay */}
        {filtersExpanded && (
          <FleetFilterPanel
            filters={fleetFilters}
            onFiltersChange={onFleetFiltersChange}
            onClose={onToggleFilters}
            shownCount={shownCount}
            totalCount={totalCount}
            extraToggle={
              <label className="flex items-center gap-2 text-sm text-cyan cursor-pointer">
                <input
                  type="checkbox"
                  checked={showInGameProperties}
                  onChange={(e) => onToggleInGameProperties(e.target.checked)}
                  className="w-4 h-4 text-cyan bg-black/60 border-cyan rounded-none focus:ring-cyan focus:ring-2"
                />
                <span className="text-sm font-bold text-cyan">
                  IN-GAME PROPERTIES
                  {isAttributesFromCache && (
                    <span className="text-xs text-phosphor-green ml-1">(cached)</span>
                  )}
                </span>
              </label>
            }
          />
        )}

        {shipsLoading ? (
          <div className="text-center text-text-muted flex-1 flex items-center justify-center">
            Loading ships...
          </div>
        ) : (
          <div className="flex gap-4 flex-1">
            {isCreator ? (
              <>
                {!participantHasFleet && (
                  <FleetShipListPanel widthClass="w-1/4" items={shipListItems} />
                )}
                <div
                  className={`${participantHasFleet ? "w-full" : "w-3/4"} h-full flex items-center justify-center`}
                >
                  {mapDisplay}
                </div>
              </>
            ) : (
              <>
                <div
                  className={`${participantHasFleet ? "w-full" : "w-3/4"} h-full flex items-center justify-center`}
                >
                  {mapDisplay}
                </div>
                {!participantHasFleet && (
                  <FleetShipListPanel widthClass="w-1/4" items={shipListItems} />
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
