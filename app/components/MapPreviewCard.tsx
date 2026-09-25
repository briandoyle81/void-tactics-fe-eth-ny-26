"use client";

import type { MapPosition, ScoringPosition } from "../types/types";
import { GRID_DIMENSIONS } from "../types/types";

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
  onEdit: () => void;
  // Web3-only (Maps.tsx) — Maps.mapMode has no web2 equivalent, so this
  // stays undefined/unrendered for MapsWeb2.tsx's usage.
  modeLabel?: string;
}

export function MapPreviewCard({ map, onEdit, modeLabel }: MapPreviewCardProps) {
  return (
    <div className="bg-steel rounded-none p-4 border border-gunmetal">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-mono text-white">{map.titleLabel}</h3>
          {modeLabel && (
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-cyan bg-cyan/10 border border-cyan/40 rounded-none">
              {modeLabel}
            </span>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onEdit}
            className="px-3 py-1 border border-cyan text-cyan rounded-none text-sm font-mono hover:bg-cyan/10"
          >
            Edit
          </button>
        </div>
      </div>

      <div className="space-y-2 text-sm text-text-secondary">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-purple border border-gunmetal"></div>
          <span>Blocked tiles: {map.blockedPositions.length}</span>
        </div>
        {map.impassablePositions && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-cyan border border-gunmetal"></div>
            <span>Impassable tiles: {map.impassablePositions.length}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-phosphor-green border border-gunmetal"></div>
          <span>Scoring tiles: {map.scoringPositions.length}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-amber border border-gunmetal"></div>
          <span>
            Once-only tiles:{" "}
            {map.scoringPositions.filter((p) => p.onlyOnce).length}
          </span>
        </div>
        {(map.creatorZonePositions !== undefined || map.joinerZonePositions !== undefined) && (
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-text-muted border border-gunmetal"></div>
            <span>
              Deployment zones: creator{" "}
              {map.creatorZonePositions && map.creatorZonePositions.length > 0
                ? `${map.creatorZonePositions.length} tiles`
                : "default"}
              , joiner{" "}
              {map.joinerZonePositions && map.joinerZonePositions.length > 0
                ? `${map.joinerZonePositions.length} tiles`
                : "default"}
            </span>
          </div>
        )}
      </div>

      {/* Mini preview */}
      <div className="mt-3 p-2 bg-near-black rounded-none">
        <div className="text-xs text-text-muted mb-1">
          Preview ({GRID_DIMENSIONS.WIDTH}x{GRID_DIMENSIONS.HEIGHT}):
        </div>
        <div
          className="grid gap-px w-full"
          style={{
            gridTemplateColumns: `repeat(${GRID_DIMENSIONS.WIDTH}, 1fr)`,
          }}
        >
          {Array.from({ length: GRID_DIMENSIONS.HEIGHT }, (_, row) =>
            Array.from({ length: GRID_DIMENSIONS.WIDTH }, (_, col) => {
              const isBlocked = map.blockedPositions.some(
                (p) => p.row === row && p.col === col
              );
              const isImpassable = (map.impassablePositions ?? []).some(
                (p) => p.row === row && p.col === col
              );
              const scoringPos = map.scoringPositions.find(
                (p) => p.row === row && p.col === col
              );
              const isScoring = scoringPos !== undefined;
              const isOnlyOnce = scoringPos?.onlyOnce || false;

              let className = "aspect-square border border-gunmetal";
              if (isBlocked && isScoring) {
                className += " bg-warning-red";
              } else if (isImpassable) {
                className += " bg-cyan";
              } else if (isBlocked) {
                className += " bg-purple";
              } else if (isScoring) {
                className += isOnlyOnce ? " bg-amber" : " bg-phosphor-green";
              } else {
                className += " bg-near-black";
              }

              return <div key={`${row}-${col}`} className={className} />;
            })
          )}
        </div>
      </div>
    </div>
  );
}
