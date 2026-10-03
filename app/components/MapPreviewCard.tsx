"use client";

import type { MapPosition, ScoringPosition } from "../types/types";
import { GRID_DIMENSIONS } from "../types/types";
import {
  COMPACT_TILE_STYLE,
  MapTileContents,
  MapTileLegend,
  mapTileClass,
  type MapTileLook,
} from "./MapTileVisual";
import { isDeploymentTile } from "../utils/deploymentZone";

// Shared between Maps.tsx (web3) and MapsWeb2.tsx (web2) — the map list
// preview card, ported verbatim from Maps.tsx. `titleLabel` is
// caller-supplied since web2 appends the map name ("Map #3 — Foo") and
// web3 doesn't have a name field ("Map #3").
export interface MapPreviewCardData {
  id: number;
  titleLabel: string;
  blockedPositions: MapPosition[];
  scoringPositions: ScoringPosition[];
  /** Movement-blocking terrain, independent of blockedPositions' LOS-only blocking. Optional — omitted shows no impassable count/preview. */
  impassablePositions?: MapPosition[];
  /**
   * Custom deployment-zone tiles per side, from Maps.getCreatorZonePositions/
   * getJoinerZonePositions — empty means that side uses the engine default
   * column band, not "no valid tiles". Optional — omitted (as opposed to an
   * empty array) shows no deployment-zone row at all, for callers with no
   * zone data source (web2).
   */
  creatorZonePositions?: MapPosition[];
  joinerZonePositions?: MapPosition[];
}

interface MapPreviewCardProps {
  map: MapPreviewCardData;
  /** Opens the map editor. Only pass this for the map admin; the Edit
   * button is hidden when omitted. */
  onEdit?: () => void;
  /** Makes the whole card clickable (pointer cursor) — used by the map
   * selection modal so picking a map is not tied to the Edit button. */
  onSelect?: () => void;
  // Web3-only (Maps.tsx) — Maps.mapMode has no web2 equivalent, so this
  // stays undefined/unrendered for MapsWeb2.tsx's usage.
  modeLabel?: string;
}

export function MapPreviewCard({ map, onEdit, onSelect, modeLabel }: MapPreviewCardProps) {
  const clickable = Boolean(onSelect);
  const hasZoneData =
    map.creatorZonePositions !== undefined || map.joinerZonePositions !== undefined;
  const creatorZone = map.creatorZonePositions ?? [];
  const joinerZone = map.joinerZonePositions ?? [];
  const has = (list: readonly MapPosition[], row: number, col: number) =>
    list.some((p) => Number(p.row) === row && Number(p.col) === col);

  // Same tile format and key as the map editor (see MapTileVisual.tsx).
  const lookAt = (row: number, col: number): MapTileLook => {
    const scoring = map.scoringPositions.find((p) => Number(p.row) === row && Number(p.col) === col);
    const look: MapTileLook = {
      blocked: has(map.blockedPositions, row, col),
      impassable: has(map.impassablePositions ?? [], row, col),
      score: scoring ? Number(scoring.points) : 0,
      onlyOnce: scoring?.onlyOnce ?? false,
    };
    if (hasZoneData) {
      if (creatorZone.length > 0 ? has(creatorZone, row, col) : isDeploymentTile(row, col, true, [])) {
        look.zone = { side: "creatorZone", isDefault: creatorZone.length === 0 };
      } else if (joinerZone.length > 0 ? has(joinerZone, row, col) : isDeploymentTile(row, col, false, [])) {
        look.zone = { side: "joinerZone", isDefault: joinerZone.length === 0 };
      }
    }
    return look;
  };

  const onlyOnceCount = map.scoringPositions.filter((p) => p.onlyOnce).length;
  const zoneCount = (zone: MapPosition[]) => (zone.length > 0 ? `${zone.length} tiles` : "default");
  return (
    <div
      className={`bg-steel rounded-none p-4 border border-gunmetal${clickable ? " cursor-pointer" : ""}`}
      onClick={onSelect}
      role={clickable ? "button" : undefined}
      tabIndex={clickable ? 0 : undefined}
      onKeyDown={
        clickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelect?.();
              }
            }
          : undefined
      }
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-mono text-white">{map.titleLabel}</h3>
          {modeLabel && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan bg-cyan/10 border border-cyan/40 rounded-none">
              {modeLabel}
            </span>
          )}
        </div>
        {onEdit && (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onEdit();
              }}
              className="px-3 py-1 border border-cyan text-cyan rounded-none text-sm font-mono hover:bg-cyan/10"
            >
              Edit
            </button>
          </div>
        )}
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        <MapTileLegend
          showZones={hasZoneData}
          hide={map.impassablePositions === undefined ? ["impassable"] : undefined}
          counts={{
            blocked: map.blockedPositions.length,
            impassable: map.impassablePositions?.length ?? 0,
            scoring: map.scoringPositions.length - onlyOnceCount,
            onlyOnce: onlyOnceCount,
            creatorZone: zoneCount(creatorZone),
            joinerZone: zoneCount(joinerZone),
          }}
        />
      </div>

      {/* Mini preview */}
      <div className="mt-3 p-2 bg-near-black rounded-none">
        <div className="text-xs text-text-muted mb-1">
          Preview ({GRID_DIMENSIONS.WIDTH}x{GRID_DIMENSIONS.HEIGHT}):
        </div>
        <div
          className="grid gap-0 w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID_DIMENSIONS.WIDTH}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) =>
            Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
              const look = lookAt(row, col);
              return (
                <div
                  key={`${row}-${col}`}
                  className={`aspect-square ${mapTileClass(look)}`}
                  style={COMPACT_TILE_STYLE}
                >
                  <MapTileContents look={look} compact />
                </div>
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
