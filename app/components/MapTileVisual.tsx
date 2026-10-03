"use client";

import React from "react";

// How a map tile looks, shared by the map editor (MapEditor.tsx) and the
// mini-map preview (MapPreviewCard.tsx) so both use one format and one key:
// - scoring: amber background (reusable) / cyan (once only), point value on top
// - blocked (LOS): purple ring on the tile edge
// - impassable (movement): red diagonal hatch, drawn above scoring
//   (inset inside the purple ring when a tile is both blocked and impassable)
// - deployment zones: C (creator, cyan) / J (joiner, red) corner badge,
//   faint when it's the side's default column band rather than a custom zone
// `compact` sizes the number and badge to the cell (container-query units)
// for the small preview grid.

export type ZoneSide = "creatorZone" | "joinerZone";

export interface MapTileLook {
  blocked: boolean;
  impassable: boolean;
  /** Point value; 0 = not a scoring tile. */
  score: number;
  onlyOnce: boolean;
  zone?: { side: ZoneSide; isDefault: boolean } | null;
}

/** Background + edge classes for a tile (callers add their own sizing/interaction classes). */
export function mapTileClass(look: MapTileLook): string {
  let c = "relative border-0";
  if (look.blocked) c += " shadow-[inset_0_0_0_2px_rgb(168,85,247)]";
  else if (!look.impassable) c += " outline outline-1 outline-gunmetal";
  if (look.score > 0) c += look.onlyOnce ? " bg-cyan" : " bg-amber";
  else c += " bg-near-black";
  return c;
}

/** Style to put on a compact tile so its contents can size against it. */
export const COMPACT_TILE_STYLE: React.CSSProperties = { containerType: "inline-size" };

function ImpassableMarker({ inset, compact }: { inset: boolean; compact: boolean }) {
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute z-[11] overflow-hidden ${inset ? "inset-[2px]" : "inset-0"}`}
      style={{
        backgroundImage: compact
          ? "repeating-linear-gradient(-45deg, transparent 0 3px, var(--color-warning-red) 3px 4px)"
          : "repeating-linear-gradient(-45deg, transparent 0 5px, var(--color-warning-red) 5px 7px)",
      }}
    />
  );
}

export function ZoneBadge({
  side,
  isDefault,
  compact = false,
}: {
  side: ZoneSide;
  isDefault: boolean;
  compact?: boolean;
}) {
  const isCreator = side === "creatorZone";
  return (
    <div
      aria-hidden
      className={`pointer-events-none absolute left-0 top-0 z-20 font-bold ${
        compact ? "px-[2px] leading-none" : "px-[3px] text-[10px] leading-[14px]"
      } ${isCreator ? "bg-cyan text-black" : "bg-warning-red text-white"} ${
        isDefault ? "opacity-35" : ""
      }`}
      style={compact ? { fontSize: "34cqw" } : undefined}
    >
      {isCreator ? "C" : "J"}
    </div>
  );
}

/** Everything drawn inside a tile: point value, impassable marker, zone badge. */
export function MapTileContents({ look, compact = false }: { look: MapTileLook; compact?: boolean }) {
  return (
    <>
      {look.score > 0 && (
        <div
          className={`relative z-[1] flex h-full w-full items-center justify-center font-bold text-black ${
            compact ? "leading-none" : "text-lg"
          }`}
          style={compact ? { fontSize: "55cqw" } : undefined}
        >
          {look.score}
        </div>
      )}
      {look.impassable && <ImpassableMarker inset={look.blocked} compact={compact} />}
      {look.zone && <ZoneBadge side={look.zone.side} isDefault={look.zone.isDefault} compact={compact} />}
    </>
  );
}

const EMPTY_LOOK: MapTileLook = { blocked: false, impassable: false, score: 0, onlyOnce: false };

const LEGEND_ITEMS: Array<{
  key: string;
  label: string;
  look: MapTileLook;
  zone?: boolean;
}> = [
  { key: "blocked", label: "Blocked (LOS)", look: { ...EMPTY_LOOK, blocked: true } },
  { key: "impassable", label: "Impassable (movement)", look: { ...EMPTY_LOOK, impassable: true } },
  { key: "scoring", label: "Scoring (reusable)", look: { ...EMPTY_LOOK, score: 5 } },
  { key: "onlyOnce", label: "Scoring (once only)", look: { ...EMPTY_LOOK, score: 5, onlyOnce: true } },
  {
    key: "creatorZone",
    label: "Creator deployment zone",
    look: { ...EMPTY_LOOK, zone: { side: "creatorZone", isDefault: false } },
    zone: true,
  },
  {
    key: "joinerZone",
    label: "Joiner deployment zone",
    look: { ...EMPTY_LOOK, zone: { side: "joinerZone", isDefault: false } },
    zone: true,
  },
];

export type MapTileLegendKey =
  | "blocked"
  | "impassable"
  | "scoring"
  | "onlyOnce"
  | "creatorZone"
  | "joinerZone";

/**
 * Key entries, each with a real rendered tile as its swatch. Returns a
 * fragment of items so callers can put them in their own container
 * alongside extra items. `counts` appends a value to an entry's label;
 * `hide` drops entries a caller has no data for.
 */
export function MapTileLegend({
  showZones,
  counts,
  hide,
}: {
  showZones: boolean;
  counts?: Partial<Record<MapTileLegendKey, string | number>>;
  hide?: MapTileLegendKey[];
}) {
  return (
    <>
      {LEGEND_ITEMS.filter((item) => (showZones || !item.zone) && !hide?.includes(item.key as MapTileLegendKey)).map(
        (item) => {
          const count = counts?.[item.key as MapTileLegendKey];
          return (
            <div key={item.key} className="flex items-center gap-2">
              <div className={`h-[20px] w-[20px] shrink-0 ${mapTileClass(item.look)}`} style={COMPACT_TILE_STYLE}>
                <MapTileContents look={item.look} compact />
              </div>
              <span>
                {item.label}
                {count !== undefined ? `: ${count}` : ""}
              </span>
            </div>
          );
        },
      )}
    </>
  );
}
