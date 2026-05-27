"use client";

import React from "react";
import { Ship } from "../types/types";
import { ShipImage, SHIP_IMAGE_RANK_STAR_BOX } from "./ShipImage";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
import { getRankProgressInfo, getRankColor } from "../utils/shipLevel";
import { formatDestroyedDate } from "../utils/dateUtils";
import { Attributes } from "../types/types";

interface ShipCardProps {
  ship: Ship;
  isStarred: boolean;
  onToggleStar: () => void;
  isSelected: boolean;
  onToggleSelection: () => void;
  onRecycleClick: () => void;
  onCustomizeClick?: () => void;
  showInGameProperties: boolean;
  inGameAttributes?: Attributes;
  attributesLoading?: boolean;
  // Selection mode props
  selectionMode?: boolean;
  hideRecycle?: boolean;
  hideCheckbox?: boolean; // Hide the checkbox for recycling selection
  onCardClick?: () => void;
  canSelect?: boolean; // Whether the ship can be selected in selection mode
  tooltipMode?: boolean; // Use fully opaque backgrounds for tooltip display
  isCurrentPlayerShip?: boolean; // Whether this ship belongs to the current player (for tooltip border color)
  flipShip?: boolean; // Whether to flip the ship image horizontally (for joiner ships in tooltip)
  reactorCriticalStatus?: "none" | "warning" | "critical"; // Reactor critical status for game view borders
  hasMoved?: boolean; // Whether the ship has moved (for game view status display)
  gameViewMode?: boolean; // Explicitly mark this as game view for styling
  /** Manage Navy: ship costsVersion behind global (shown only when not destroyed / not in fleet). */
  costsVersionStale?: boolean;
  /** Manage Navy: calls Ships.syncShipCosts (not setCostOfShip, which is owner/game). */
  costVersionSyncButton?: React.ReactNode;
  /** Manage Navy: enables row sync of name block height via data attributes */
  layoutShipId?: string;
  /** Manage Navy: min height (px) for the star+name row to align cards in a grid row */
  nameBlockMinHeightPx?: number;
  /** Grid hover tooltip: tile row/col under the cursor (ghost / preview / live). */
  tooltipGridPosition?: { row: number; col: number };
  /** Manage Navy: optional fleet composition add/remove controls below stats. */
  fleetCompositionControls?: React.ReactNode;
  /** Hide COMMON/SHINY badge (used by compact mobile game UI). */
  hideRarityLabel?: boolean;
  /** Hide rank badge (used by compact mobile game UI). */
  hideRankLabel?: boolean;
  /** Render card content without outer border/padding frame. */
  hideOuterFrame?: boolean;
}

const SPECIAL_RANGES: Record<number, number> = {
  1: 3, // EMP
  2: 2, // Repair
  3: 3, // Flak
};

const ShipCard: React.FC<ShipCardProps> = ({
  ship,
  isStarred,
  onToggleStar,
  isSelected,
  onToggleSelection,
  onRecycleClick,
  onCustomizeClick,
  showInGameProperties,
  inGameAttributes,
  attributesLoading = false,
  selectionMode = false,
  hideRecycle = false,
  hideCheckbox = false,
  onCardClick,
  canSelect = true,
  tooltipMode = false,
  isCurrentPlayerShip = false,
  flipShip = false,
  reactorCriticalStatus = "none",
  hasMoved = false,
  gameViewMode = false,
  costsVersionStale = false,
  costVersionSyncButton,
  layoutShipId,
  nameBlockMinHeightPx,
  tooltipGridPosition,
  fleetCompositionControls,
  hideRarityLabel = false,
  hideRankLabel = false,
  hideOuterFrame = false,
}) => {
  const useCompactStatGrid = gameViewMode && hideRarityLabel && hideRankLabel;
  const useTeamArtBorder = gameViewMode && hideOuterFrame;
  const shipArtBorderColor = useTeamArtBorder
    ? isCurrentPlayerShip
      ? "var(--color-cyan)"
      : "var(--color-warning-red)"
    : "var(--color-gunmetal)";
  // Determine border class based on selection mode and ship state
  const getBorderClass = () => {
    const isInGameView = tooltipMode || gameViewMode;
    const isDisabledInGame =
      showInGameProperties &&
      inGameAttributes &&
      !(ship.shipData.timestampDestroyed > 0) &&
      inGameAttributes.hullPoints === 0;

    if (isInGameView && isDisabledInGame) {
      return tooltipMode
        ? "border-steel bg-near-black"
        : "border-steel bg-near-black";
    }

    // Reactor critical status takes priority (for game view)
    if (reactorCriticalStatus === "critical") {
      return "border-warning-red bg-near-black";
    }
    if (reactorCriticalStatus === "warning") {
      return "border-amber bg-near-black";
    }

    // Game view (tooltip or Ship Details): blue for current player, red for opponent
    if (
      isInGameView &&
      ship.shipData.constructed &&
      !ship.shipData.timestampDestroyed
    ) {
      if (!isCurrentPlayerShip && hasMoved) {
        return tooltipMode
          ? "border-steel bg-near-black"
          : "border-steel bg-near-black";
      }
      return tooltipMode
        ? isCurrentPlayerShip
          ? "border-cyan bg-near-black"
          : "border-warning-red bg-near-black"
        : isCurrentPlayerShip
        ? "border-cyan bg-cyan/20"
        : "border-warning-red bg-warning-red/20";
    }

    if (selectionMode && isSelected) {
      return tooltipMode
        ? "border-phosphor-green bg-near-black"
        : "border-phosphor-green bg-phosphor-green/20";
    }
    if (ship.shipData.timestampDestroyed > 0) {
      return tooltipMode
        ? "border-warning-red bg-near-black"
        : "border-warning-red bg-black/60";
    }
    if (ship.shipData.inFleet) {
      return tooltipMode
        ? "border-amber bg-near-black"
        : "border-amber bg-amber/20";
    }
    if (
      costsVersionStale &&
      ship.shipData.constructed &&
      !(ship.shipData.timestampDestroyed > 0) &&
      !ship.shipData.inFleet
    ) {
      return tooltipMode
        ? "border-amber bg-near-black"
        : "border-amber bg-amber/20";
    }
    if (ship.shipData.constructed) {
      if (selectionMode) {
        return tooltipMode
          ? canSelect
            ? "border-steel bg-near-black"
            : "border-steel bg-near-black opacity-50 cursor-not-allowed"
          : canSelect
          ? "border-steel bg-black/40 hover:border-cyan hover:bg-cyan/10"
          : "border-steel bg-black/40 opacity-50 cursor-not-allowed";
      }
      return tooltipMode
        ? "border-phosphor-green bg-near-black"
        : "border-phosphor-green bg-black/40";
    }
    return tooltipMode
      ? "border-steel bg-near-black"
      : "border-steel bg-black/60";
  };

  const handleCardClick = () => {
    if (selectionMode && onCardClick && canSelect) {
      onCardClick();
    }
  };

  // Get industrial border styles
  const getIndustrialBorderStyle = () => {
    const isInGameView = tooltipMode || gameViewMode;
    const greyFleetCardBorder = {
      borderColor: "var(--color-gunmetal)",
      borderTopColor: "var(--color-steel)",
      borderLeftColor: "var(--color-steel)",
      backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
    } as const;

    // Disabled in match (0 HP): grey, not team red/blue or reactor red.
    const isDisabledInGame =
      showInGameProperties &&
      inGameAttributes &&
      !(ship.shipData.timestampDestroyed > 0) &&
      inGameAttributes.hullPoints === 0;

    if (isInGameView && isDisabledInGame) {
      return { ...greyFleetCardBorder };
    }

    if (reactorCriticalStatus === "critical") {
      return {
        borderColor: "var(--color-warning-red)",
        borderTopColor: "var(--color-warning-red)",
        borderLeftColor: "var(--color-warning-red)",
        backgroundColor: "var(--color-slate)",
      };
    }
    if (reactorCriticalStatus === "warning") {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: "var(--color-slate)",
      };
    }

    if (isInGameView && ship.shipData.constructed && !ship.shipData.timestampDestroyed) {
      // Opponent ship has already acted this round: grey instead of red "team" border.
      if (!isCurrentPlayerShip && hasMoved) {
        return { ...greyFleetCardBorder };
      }
      return {
        borderColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        borderTopColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        borderLeftColor: isCurrentPlayerShip ? "var(--color-cyan)" : "var(--color-warning-red)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }

    if (selectionMode && isSelected) {
      return {
        borderColor: "var(--color-phosphor-green)",
        borderTopColor: "var(--color-phosphor-green)",
        borderLeftColor: "var(--color-phosphor-green)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.timestampDestroyed > 0) {
      return {
        borderColor: "var(--color-warning-red)",
        borderTopColor: "var(--color-warning-red)",
        borderLeftColor: "var(--color-warning-red)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.inFleet) {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (
      costsVersionStale &&
      ship.shipData.constructed &&
      !(ship.shipData.timestampDestroyed > 0) &&
      !ship.shipData.inFleet
    ) {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (ship.shipData.constructed) {
      if (selectionMode) {
        return {
          borderColor: canSelect ? "var(--color-gunmetal)" : "var(--color-gunmetal)",
          borderTopColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          borderLeftColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          backgroundColor: "var(--color-slate)",
          opacity: canSelect ? 1 : 0.5,
        };
      }
      return {
        borderColor: "var(--color-phosphor-green)",
        borderTopColor: "var(--color-phosphor-green)",
        borderLeftColor: "var(--color-phosphor-green)",
        backgroundColor: "var(--color-near-black)",
      };
    }
    return {
      borderColor: "var(--color-gunmetal)",
      borderTopColor: "var(--color-steel)",
      borderLeftColor: "var(--color-steel)",
      backgroundColor: "var(--color-near-black)",
    };
  };

  const borderStyle = getIndustrialBorderStyle();
  const rankInfo = getRankProgressInfo(ship);
  const rankTooltipLines =
    rankInfo.nextRank == null
      ? [`Kills: ${rankInfo.shipsDestroyed}`, "Max rank reached"]
      : [
          `Kills: ${rankInfo.shipsDestroyed}`,
          `Next rank (R${rankInfo.nextRank}) in ${rankInfo.killsToNextRank} kill${rankInfo.killsToNextRank === 1 ? "" : "s"}`,
        ];
  const rankTooltipAccent =
    rankInfo.rank <= 2
      ? "var(--color-phosphor-green)"
      : rankInfo.rank <= 4
        ? "var(--color-cyan)"
        : rankInfo.rank === 5
          ? "var(--color-amber)"
          : "var(--color-warning-red)";

  // Rank progress bar (shown below badge in manage-navy view)
  const RANK_THRESHOLDS = [0, 10, 30, 100, 300, 1000] as const;
  const rankStart = RANK_THRESHOLDS[rankInfo.rank - 1] ?? 0;
  const rankEnd: number | null = rankInfo.rank < 6 ? (RANK_THRESHOLDS[rankInfo.rank] ?? null) : null;
  const rankProgressPct = rankEnd !== null
    ? Math.min(100, Math.round(((rankInfo.shipsDestroyed - rankStart) / (rankEnd - rankStart)) * 100))
    : 100;

  return (
    <div
      className={`${
        hideOuterFrame ? "" : "border border-solid p-4"
      } ${
        selectionMode && canSelect
          ? "cursor-pointer transition-colors duration-150"
          : ""
      }`}
      {...(layoutShipId ? { "data-ship-id": layoutShipId } : {})}
      style={{
        ...(hideOuterFrame ? {} : borderStyle),
        borderRadius: 0, // Square corners
      }}
      onClick={handleCardClick}
      onMouseEnter={(e) => {
        if (selectionMode && canSelect && !isSelected) {
          e.currentTarget.style.borderColor = "var(--color-cyan)";
          e.currentTarget.style.borderTopColor = "var(--color-cyan)";
          e.currentTarget.style.borderLeftColor = "var(--color-cyan)";
          e.currentTarget.style.backgroundColor = "var(--color-steel)";
        }
      }}
      onMouseLeave={(e) => {
        if (selectionMode && canSelect && !isSelected) {
          e.currentTarget.style.borderColor = borderStyle.borderColor;
          e.currentTarget.style.borderTopColor = borderStyle.borderTopColor;
          e.currentTarget.style.borderLeftColor = borderStyle.borderLeftColor;
          e.currentTarget.style.backgroundColor = borderStyle.backgroundColor;
        }
      }}
    >
      {/* Ship Image - Bigger */}
      <div
        className="relative mb-3 h-48 w-full min-h-0 [container-type:size]"
        style={flipShip ? { transform: "scaleX(-1)" } : undefined}
      >
        <ShipImage
          key={`${ship.id.toString()}-${
            ship.shipData.constructed ? "constructed" : "unconstructed"
          }`}
          ship={ship}
          className="h-full w-full border border-solid"
          style={{
            borderColor: shipArtBorderColor,
            borderRadius: 0, // Square corners
          }}
          showLoadingState={true}
        />

        {/* Game view indicators for tooltip */}
        {(tooltipMode || gameViewMode) && inGameAttributes && (
          <>
            {/* Health bar for damaged ships */}
            {inGameAttributes.hullPoints < inGameAttributes.maxHullPoints && (
              <div
                className="absolute -top-2 left-0 right-0 z-10"
                dir="ltr"
                style={
                  flipShip
                    ? { transform: "scaleX(-1)" }
                    : undefined
                }
              >
                <div
                  className="relative h-1 w-full overflow-hidden transition-all duration-300"
                  style={{
                    backgroundColor: "var(--color-gunmetal)",
                    borderRadius: 0,
                  }}
                >
                  <div
                    className="absolute left-0 top-0 h-full transition-all duration-300"
                    style={{
                      backgroundColor:
                        (inGameAttributes.hullPoints /
                          inGameAttributes.maxHullPoints) *
                          100 <=
                        25
                          ? "var(--color-warning-red)"
                          : "var(--color-phosphor-green)",
                      borderRadius: 0,
                      width: `${
                        (inGameAttributes.hullPoints /
                          inGameAttributes.maxHullPoints) *
                        100
                      }%`,
                    }}
                  />
                </div>
              </div>
            )}

            {/* Moved badge */}
            {hasMoved && (
              <div
                className={`absolute ${
                  flipShip ? "bottom-0 right-0" : "bottom-0 left-0"
                } m-1 w-4 h-4 rounded-full text-[10px] font-mono flex items-center justify-center ${
                  isCurrentPlayerShip ? "bg-cyan/80" : "bg-warning-red/80"
                } text-text-primary`}
              >
                M
              </div>
            )}

            {/* Reactor critical skulls */}
            {inGameAttributes.reactorCriticalTimer > 0 && (
              <div
                className={`absolute ${
                  flipShip ? "bottom-0 left-0" : "bottom-0 right-0"
                } m-1 flex items-center gap-0.5`}
              >
                {Array.from(
                  { length: Math.min(inGameAttributes.reactorCriticalTimer, 3) },
                  (_, index) => index,
                ).map((level) => (
                  <div
                    key={level}
                    className="flex shrink-0 items-center justify-center rounded-full bg-warning-red/90"
                    style={{
                      width: SHIP_IMAGE_RANK_STAR_BOX,
                      height: SHIP_IMAGE_RANK_STAR_BOX,
                      // Reference em size for the skull (calc(0.85 * clamp(...)) is often dropped by engines).
                      fontSize: SHIP_IMAGE_RANK_STAR_BOX,
                      lineHeight: 1,
                    }}
                  >
                    <span
                      className="font-mono block text-center leading-none"
                      style={{ fontSize: "0.85em", lineHeight: 1 }}
                    >
                      ✕
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Zero HP indicator */}
            {inGameAttributes.hullPoints === 0 && (
              tooltipMode ? (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 mt-1 z-20 pointer-events-none">
                  <div className="w-5 h-5 flex items-center justify-center animate-pulse">
                    <span className="text-xs font-mono">[SOS]</span>
                  </div>
                </div>
              ) : (
                <div
                  className={`absolute w-5 h-5 flex items-center justify-center animate-pulse ${
                    gameViewMode
                      ? "top-0 left-1/2 -translate-x-1/2 mt-1"
                      : "top-0 right-0 m-1"
                  }`}
                >
                  <span className="text-xs font-mono">[SOS]</span>
                </div>
              )
            )}
          </>
        )}
      </div>

      <div
        className={`flex justify-between items-start ${
          useCompactStatGrid ? "mb-1.5" : "mb-3"
        }`}
      >
        <div
          className={`flex items-start min-w-0 ${
            useCompactStatGrid ? "gap-1.5" : "gap-2"
          }`}
          {...(layoutShipId ? { "data-ship-name-block": "" } : {})}
          style={
            nameBlockMinHeightPx && nameBlockMinHeightPx > 0
              ? { minHeight: nameBlockMinHeightPx }
              : undefined
          }
        >
          {/* Star icon where checkbox used to be */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleStar();
            }}
            className={`shrink-0 hover:bg-amber/10 rounded-none transition-all duration-200 ${
              useCompactStatGrid ? "p-0.5 mt-0" : "p-1 mt-0.5"
            }`}
          >
            <svg
              className={`w-4 h-4 ${
                isStarred
                  ? "text-amber fill-amber"
                  : "text-amber"
              }`}
              fill={isStarred ? "currentColor" : "none"}
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
          <h5
            className={`font-bold min-w-0 break-words leading-tight ${
              useCompactStatGrid ? "text-base" : "text-lg"
            }`}
          >
            {ship.name || `Ship #${ship.id}`}
          </h5>
        </div>
        <div className="flex items-center gap-2">
          {/* Modify / customize icon */}
          {onCustomizeClick && ship.shipData.constructed && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onCustomizeClick();
              }}
              disabled={ship.shipData.inFleet}
              className="p-1 text-cyan hover:text-cyan hover:bg-cyan/10 rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                ship.shipData.inFleet
                  ? "Cannot modify ship in fleet"
                  : "Modify ship"
              }
            >
              {/* wrench icon */}
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          )}
          {/* Recycle icon */}
          {!hideRecycle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecycleClick();
              }}
              disabled={ship.shipData.inFleet}
              className="p-1 text-warning-red hover:text-warning-red hover:bg-warning-red/10 rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                ship.shipData.inFleet
                  ? "Cannot recycle ship in fleet"
                  : "Recycle ship"
              }
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                />
              </svg>
            </button>
          )}
          {/* Checkbox for selection */}
          {!hideCheckbox && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => {
                e.stopPropagation();
                onToggleSelection();
              }}
              onClick={(e) => e.stopPropagation()}
              disabled={ship.shipData.inFleet}
              className="w-4 h-4 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                accentColor: "var(--color-cyan)",
                borderColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                backgroundColor: isSelected
                  ? "var(--color-cyan)"
                  : "var(--color-near-black)",
                borderTopColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                borderLeftColor: isSelected ? "var(--color-cyan)" : "var(--color-cyan)",
                borderRadius: 0, // Square checkbox
                appearance: "none",
                WebkitAppearance: "none",
                MozAppearance: "none",
                width: "16px",
                height: "16px",
                border: "2px solid",
                position: "relative",
              }}
            />
          )}
          {!hideRarityLabel && (
            <span
              className="inline-flex shrink-0 items-center gap-0.5 whitespace-nowrap text-xs px-2 py-1 border border-solid uppercase font-semibold tracking-wider"
              style={{
                fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                backgroundColor: ship.shipData.shiny
                  ? "var(--color-near-black)"
                  : "var(--color-near-black)",
                color: ship.shipData.shiny
                  ? "var(--color-amber)"
                  : "var(--color-text-secondary)",
                borderColor: ship.shipData.shiny
                  ? "var(--color-amber)"
                  : "var(--color-gunmetal)",
                borderTopColor: ship.shipData.shiny
                  ? "var(--color-amber)"
                  : "var(--color-steel)",
                borderLeftColor: ship.shipData.shiny
                  ? "var(--color-amber)"
                  : "var(--color-steel)",
                borderRadius: 0, // Square corners
              }}
            >
              {ship.shipData.shiny ? "SHINY ★" : "COMMON"}
            </span>
          )}
          {/* Rank */}
          {(ship.shipData.constructed || ship.shipData.shipsDestroyed > 0) && !hideRankLabel && (
            <div className="relative group">
              <span
                className={`text-xs px-2 py-1 border border-solid uppercase font-semibold tracking-wider cursor-default ${getRankColor(
                  rankInfo.rank,
                )}`}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  borderRadius: 0, // Square corners
                }}
              >
                R{rankInfo.rank}
              </span>
              <div
                className="pointer-events-none absolute right-0 top-full mt-1 hidden min-w-max border border-solid px-2 py-1 text-xs group-hover:block z-20"
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  backgroundColor: "var(--color-slate)",
                  color: "var(--color-text-primary)",
                  borderColor: rankTooltipAccent,
                  borderTopColor: rankTooltipAccent,
                  borderLeftColor: rankTooltipAccent,
                  borderRadius: 0,
                  boxShadow: `0 0 12px color-mix(in srgb, ${rankTooltipAccent} 25%, transparent)`,
                }}
              >
                <div style={{ color: rankTooltipAccent }}>{rankTooltipLines[0]}</div>
                <div className="opacity-80">{rankTooltipLines[1]}</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rank progress — only in manage-navy (non-game, non-tooltip) */}
      {(ship.shipData.constructed || ship.shipData.shipsDestroyed > 0) && !hideRankLabel && !gameViewMode && !tooltipMode && (
        <div className="mt-1.5 mb-2 space-y-0.5">
          <div className="flex items-center justify-between text-[10px] font-mono"
            style={{ fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace" }}
          >
            <span className="opacity-60">
              {rankInfo.shipsDestroyed === 1 ? "1 kill" : `${rankInfo.shipsDestroyed} kills`}
            </span>
            {rankEnd !== null ? (
              <span className="opacity-60">{rankInfo.killsToNextRank} to R{rankInfo.nextRank}</span>
            ) : (
              <span style={{ color: rankTooltipAccent }} className="font-semibold">MAX RANK</span>
            )}
          </div>
          <div className="h-1 w-full" style={{ backgroundColor: "var(--color-gunmetal)" }}>
            <div
              className="h-1 transition-all"
              style={{ width: `${rankProgressPct}%`, backgroundColor: rankTooltipAccent }}
            />
          </div>
        </div>
      )}

      {/* Compact Stats or Construction Message */}
      <div className="space-y-2 text-sm">
        {ship.shipData.constructed ? (
          <div
            className={`grid gap-y-1 text-xs relative ${
              useCompactStatGrid
                ? "grid-cols-2 gap-x-2"
                : "grid-cols-3 gap-x-4"
            }`}
          >
            {showInGameProperties ? (
              // In-Game Properties
              (() => {
                if (!inGameAttributes) {
                  return (
                    <div className="col-span-3 text-center text-text-muted text-xs">
                      {attributesLoading
                        ? "Loading attributes..."
                        : "Attributes not available"}
                    </div>
                  );
                }
                return (
                  <>
                    {tooltipMode && tooltipGridPosition != null && (
                      <div className="flex justify-between col-span-3 border-b border-gunmetal/80 pb-1 mb-0.5">
                        <span className="opacity-60">Position:</span>
                        <span className="ml-2 font-mono">
                          ({tooltipGridPosition.row},{" "}
                          {tooltipGridPosition.col})
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="opacity-60">Weapon:</span>
                      <span className="ml-2">
                        {getMainWeaponName(ship.equipment.mainWeapon)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Range:</span>
                      <span className="ml-2">
                        {inGameAttributes.range}
                        {ship.equipment.special > 0 && (
                          <span className="opacity-50"> / {SPECIAL_RANGES[ship.equipment.special] ?? "?"}</span>
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Damage:</span>
                      <span className="ml-2">{inGameAttributes.gunDamage}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Hull:</span>
                      <span className="ml-2">
                        {inGameAttributes.hullPoints}/
                        {inGameAttributes.maxHullPoints}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Move:</span>
                      <span className="ml-2">{inGameAttributes.movement}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">
                        {ship.equipment.shields > 0
                          ? "Shields:"
                          : "Armor:"}
                      </span>
                      <span className="ml-2">
                        {inGameAttributes.damageReduction}%
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Special:</span>
                      <span className="ml-2">
                        {getSpecialName(ship.equipment.special)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 col-span-full">
                      <div className="flex items-center">
                        <span className="opacity-60">Status:</span>
                        <span
                          className={`ml-2 ${
                            ship.shipData.timestampDestroyed > 0
                              ? "text-warning-red"
                              : hasMoved
                              ? "text-amber"
                              : gameViewMode || tooltipMode
                              ? "text-cyan" // Unmoved in game view
                              : ship.shipData.inFleet
                              ? "text-amber"
                              : "text-phosphor-green"
                          }`}
                        >
                          {ship.shipData.timestampDestroyed > 0
                            ? `DESTROYED ${formatDestroyedDate(ship.shipData.timestampDestroyed)}`
                            : hasMoved
                            ? "MOVED"
                            : gameViewMode || tooltipMode
                            ? "READY" // Unmoved in game view
                            : ship.shipData.inFleet
                            ? "IN FLEET"
                            : "READY"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="opacity-60">Threat:</span>
                        <span className="ml-2 font-bold">
                          {ship.shipData.cost}
                        </span>
                      </div>
                    </div>
                  </>
                );
              })()
            ) : (
              // NFT Properties (original)
              <>
                <div className="flex justify-between">
                  <span className="opacity-60">Acc:</span>
                  <span className="ml-2">{ship.traits.accuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Hull:</span>
                  <span className="ml-2">{ship.traits.hull}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Speed:</span>
                  <span className="ml-2">{ship.traits.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Kills:</span>
                  <span className="ml-2 font-semibold" style={{ color: rankInfo.shipsDestroyed > 0 ? rankTooltipAccent : undefined }}>
                    {rankInfo.shipsDestroyed}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Wpn:</span>
                  <span className="ml-2">
                    {getMainWeaponName(ship.equipment.mainWeapon)}
                  </span>
                </div>
                {inGameAttributes && (
                  <div className="flex justify-between">
                    <span className="opacity-60">Rng:</span>
                    <span className="ml-2">
                      {inGameAttributes.range}
                      {ship.equipment.special > 0 && (
                        <span className="opacity-50"> / {SPECIAL_RANGES[ship.equipment.special] ?? "?"}</span>
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="opacity-60">
                    {ship.equipment.shields > 0 ? "Shd:" : "Arm:"}
                  </span>
                  <span className="ml-2">
                    {ship.equipment.shields > 0
                      ? getShieldName(ship.equipment.shields)
                      : getArmorName(ship.equipment.armor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Spc:</span>
                  <span className="ml-2">
                    {getSpecialName(ship.equipment.special)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 col-span-full">
                  <div className="flex items-center">
                    <span className="opacity-60">Status:</span>
                    <span
                      className={`ml-2 ${
                        ship.shipData.timestampDestroyed > 0
                          ? "text-warning-red"
                          : hasMoved
                          ? "text-amber"
                          : gameViewMode || tooltipMode
                          ? "text-cyan" // Unmoved in game view
                          : ship.shipData.inFleet
                          ? "text-amber"
                          : "text-phosphor-green"
                      }`}
                    >
                      {ship.shipData.timestampDestroyed > 0
                        ? `DESTROYED ${formatDestroyedDate(ship.shipData.timestampDestroyed)}`
                        : hasMoved
                        ? "MOVED"
                        : gameViewMode || tooltipMode
                        ? "READY" // Unmoved in game view
                        : ship.shipData.inFleet
                        ? "IN FLEET"
                        : "READY"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="opacity-60">Threat:</span>
                    <span className="ml-2 font-bold">{ship.shipData.cost}</span>
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="text-center py-4 px-2">
            <div className="text-text-muted text-sm font-mono font-bold">
              [CONSTRUCT SHIP]
            </div>
          </div>
        )}
      </div>
      {fleetCompositionControls != null && (
        <div className="mt-2" onClick={(e) => e.stopPropagation()} role="presentation">
          {fleetCompositionControls}
        </div>
      )}
      {/* Selection Indicator */}
      {selectionMode && isSelected && (
        <div className="mt-2 text-center">
          <span className="text-phosphor-green text-sm font-bold">✓ SELECTED</span>
        </div>
      )}
      {costsVersionStale && costVersionSyncButton && (
        <div
          className="mt-3 w-full"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          {costVersionSyncButton}
        </div>
      )}
    </div>
  );
};

export default ShipCard;
