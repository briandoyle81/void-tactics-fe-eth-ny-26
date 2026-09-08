"use client";

import React from "react";
import { SHIP_IMAGE_RANK_STAR_BOX } from "./ShipImage";
import {
  getMainWeaponName,
  getSpecialName,
  getArmorName,
  getShieldName,
} from "../types/types";
import { getRankColor, getRankColorVar } from "../utils/shipLevel";
import { formatDestroyedDate } from "../utils/dateUtils";
import { Attributes } from "../types/types";
import type { ShipCardData } from "../types/shipCardData";

interface ShipCardProps {
  ship: ShipCardData;
  /** Rendered ship art — caller builds `<ShipImage ship={...} .../>` (web3) or `<ShipImageWeb2 ship={...} .../>` (web2). */
  shipImage: React.ReactNode;
  isStarred: boolean;
  onToggleStar: () => void;
  isSelected: boolean;
  onToggleSelection: () => void;
  onRecycleClick: () => void;
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

const ShipCard: React.FC<ShipCardProps> = ({
  ship: data,
  shipImage,
  isStarred,
  onToggleStar,
  isSelected,
  onToggleSelection,
  onRecycleClick,
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
      !data.isDestroyed &&
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

    if (isInGameView && data.isConstructed && !data.isDestroyed) {
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
    if (data.isDestroyed) {
      return {
        borderColor: "var(--color-warning-red)",
        borderTopColor: "var(--color-warning-red)",
        borderLeftColor: "var(--color-warning-red)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (costsVersionStale && data.isConstructed && !data.isDestroyed && !data.inFleet) {
      return {
        borderColor: "var(--color-amber)",
        borderTopColor: "var(--color-amber)",
        borderLeftColor: "var(--color-amber)",
        backgroundColor: tooltipMode ? "var(--color-slate)" : "var(--color-near-black)",
      };
    }
    if (data.isConstructed) {
      if (selectionMode) {
        return {
          borderColor: canSelect ? "var(--color-gunmetal)" : "var(--color-gunmetal)",
          borderTopColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          borderLeftColor: canSelect ? "var(--color-steel)" : "var(--color-gunmetal)",
          backgroundColor: "var(--color-slate)",
          opacity: canSelect ? 1 : 0.5,
        };
      }
      // Rank-colored border (matches the R{rank} badge and purchase-tier
      // colors — see getRankColorVar). In-fleet ships keep this same color
      // rather than switching to amber; the card is dimmed instead so
      // "in fleet" reads as a card-level state, not a rank-colored one.
      // The amber "IN FLEET" status text elsewhere on the card is unrelated
      // and unchanged.
      const rankColor = getRankColorVar(data.rank);
      return {
        borderColor: rankColor,
        borderTopColor: rankColor,
        borderLeftColor: rankColor,
        backgroundColor: "var(--color-near-black)",
        opacity: data.inFleet ? 0.5 : 1,
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
  const rankTooltipLines =
    data.rankNextRank == null
      ? [`Kills: ${data.rankShipsDestroyed}`, "Max rank reached"]
      : [
          `Kills: ${data.rankShipsDestroyed}`,
          `Next rank (R${data.rankNextRank}) in ${data.rankKillsToNextRank} kill${data.rankKillsToNextRank === 1 ? "" : "s"}`,
        ];
  const rankTooltipAccent =
    data.rank <= 2
      ? "var(--color-phosphor-green)"
      : data.rank <= 4
        ? "var(--color-cyan)"
        : data.rank === 5
          ? "var(--color-amber)"
          : "var(--color-warning-red)";

  return (
    <div
      className={`h-full ${
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
        <div
          className="h-full w-full border border-solid"
          style={{
            borderColor: shipArtBorderColor,
            borderRadius: 0, // Square corners
          }}
        >
          {shipImage}
        </div>

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
            {data.name || `Ship #${data.id}`}
          </h5>
        </div>
        <div className="flex items-center gap-2">
          {/* Recycle icon */}
          {!hideRecycle && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onRecycleClick();
              }}
              disabled={data.inFleet}
              className="p-1 text-warning-red hover:text-warning-red hover:bg-warning-red/10 rounded-none transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              title={
                data.inFleet
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
              disabled={data.inFleet}
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
                backgroundColor: data.isShiny
                  ? "var(--color-near-black)"
                  : "var(--color-near-black)",
                color: data.isShiny
                  ? "var(--color-amber)"
                  : "var(--color-text-secondary)",
                borderColor: data.isShiny
                  ? "var(--color-amber)"
                  : "var(--color-gunmetal)",
                borderTopColor: data.isShiny
                  ? "var(--color-amber)"
                  : "var(--color-steel)",
                borderLeftColor: data.isShiny
                  ? "var(--color-amber)"
                  : "var(--color-steel)",
                borderRadius: 0, // Square corners
              }}
            >
              {data.isShiny ? "SHINY ★" : "COMMON"}
            </span>
          )}
          {/* Rank */}
          {data.isConstructed && !hideRankLabel && (
            <div className="relative group">
              <span
                className={`text-xs px-2 py-1 border border-solid uppercase font-semibold tracking-wider cursor-default ${getRankColor(
                  data.rank,
                )}`}
                style={{
                  fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
                  borderRadius: 0, // Square corners
                }}
              >
                R{data.rank}
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

      {/* Compact Stats or Construction Message */}
      <div className="space-y-2 text-sm">
        {data.isConstructed ? (
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
                        {getMainWeaponName(data.equipment.mainWeapon, data.traits.variant)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="opacity-60">Range:</span>
                      <span className="ml-2">{inGameAttributes.range}</span>
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
                        {data.equipment.shields > 0
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
                        {getSpecialName(data.equipment.special, data.traits.variant)}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 col-span-full">
                      <div className="flex items-center">
                        <span className="opacity-60">Status:</span>
                        <span
                          className={`ml-2 ${
                            data.isDestroyed
                              ? "text-warning-red"
                              : hasMoved
                              ? "text-amber"
                              : gameViewMode || tooltipMode
                              ? "text-cyan" // Unmoved in game view
                              : data.inFleet
                              ? "text-amber"
                              : "text-phosphor-green"
                          }`}
                        >
                          {data.isDestroyed
                            ? `DESTROYED ${formatDestroyedDate(data.timestampDestroyedSeconds)}`
                            : hasMoved
                            ? "MOVED"
                            : gameViewMode || tooltipMode
                            ? "READY" // Unmoved in game view
                            : data.inFleet
                            ? "IN FLEET"
                            : "READY"}
                        </span>
                      </div>
                      <div className="flex items-center">
                        <span className="opacity-60">Threat:</span>
                        <span className="ml-2 font-bold">
                          {data.cost}
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
                  <span className="ml-2">{data.traits.accuracy}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Hull:</span>
                  <span className="ml-2">{data.traits.hull}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Speed:</span>
                  <span className="ml-2">{data.traits.speed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Wpn:</span>
                  <span className="ml-2">
                    {getMainWeaponName(data.equipment.mainWeapon, data.traits.variant)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">
                    {data.equipment.shields > 0 ? "Shd:" : "Arm:"}
                  </span>
                  <span className="ml-2">
                    {data.equipment.shields > 0
                      ? getShieldName(data.equipment.shields)
                      : getArmorName(data.equipment.armor)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="opacity-60">Spc:</span>
                  <span className="ml-2">
                    {getSpecialName(data.equipment.special, data.traits.variant)}
                  </span>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 col-span-full">
                  <div className="flex items-center">
                    <span className="opacity-60">Status:</span>
                    <span
                      className={`ml-2 ${
                        data.isDestroyed
                          ? "text-warning-red"
                          : hasMoved
                          ? "text-amber"
                          : gameViewMode || tooltipMode
                          ? "text-cyan" // Unmoved in game view
                          : data.inFleet
                          ? "text-amber"
                          : "text-phosphor-green"
                      }`}
                    >
                      {data.isDestroyed
                        ? `DESTROYED ${formatDestroyedDate(data.timestampDestroyedSeconds)}`
                        : hasMoved
                        ? "MOVED"
                        : gameViewMode || tooltipMode
                        ? "READY" // Unmoved in game view
                        : data.inFleet
                        ? "IN FLEET"
                        : "READY"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <span className="opacity-60">Threat:</span>
                    <span className="ml-2 font-bold">{data.cost}</span>
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
