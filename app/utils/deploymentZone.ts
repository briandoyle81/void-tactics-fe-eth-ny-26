import { GRID_DIMENSIONS } from "../types/types";

// Deployment-zone rules shared by web2's server routes (fleet submission
// checks) and client (placement UI, map editor). Mirrors web3's Maps.sol:
// a side with a custom zone may only deploy on those tiles; a side without
// one uses the engine default column band.

// A type alias (not an interface) so it's assignable to Prisma's JSON input type.
export type ZoneTile = {
  row: number;
  col: number;
};

/** Maps.sol's DEFAULT_CREATOR/JOINER_MIN/MAX_COL. */
export const DEFAULT_DEPLOYMENT_COLS = {
  creator: { colMin: 0, colMax: 3 },
  joiner: { colMin: 13, colMax: 16 },
} as const;

const inBounds = (row: number, col: number) =>
  Number.isInteger(row) &&
  Number.isInteger(col) &&
  row >= 0 &&
  row < GRID_DIMENSIONS.HEIGHT &&
  col >= 0 &&
  col < GRID_DIMENSIONS.WIDTH;

/**
 * Parses a stored/submitted zone into clean tiles, or null if it isn't a
 * valid tile list (wrong shape or out-of-bounds tile). Duplicates are dropped.
 */
export function parseZoneTiles(value: unknown): ZoneTile[] | null {
  if (!Array.isArray(value)) return null;
  const seen = new Set<string>();
  const tiles: ZoneTile[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object") return null;
    const row = Number((item as { row?: unknown }).row);
    const col = Number((item as { col?: unknown }).col);
    if (!inBounds(row, col)) return null;
    const key = `${row},${col}`;
    if (seen.has(key)) continue;
    seen.add(key);
    tiles.push({ row, col });
  }
  return tiles;
}

/** Whether (row, col) is a legal deployment tile for this side. */
export function isDeploymentTile(
  row: number,
  col: number,
  isCreator: boolean,
  customZone: readonly ZoneTile[] | null | undefined,
): boolean {
  if (!inBounds(row, col)) return false;
  if (customZone && customZone.length > 0) {
    return customZone.some((t) => t.row === row && t.col === col);
  }
  const band = isCreator ? DEFAULT_DEPLOYMENT_COLS.creator : DEFAULT_DEPLOYMENT_COLS.joiner;
  return col >= band.colMin && col <= band.colMax;
}

/**
 * Checks a fleet's submitted starting positions: one per ship, all distinct,
 * all on this side's deployment tiles. Returns an error message, or null if
 * they're valid.
 */
export function startingPositionsError(
  positions: unknown,
  shipCount: number,
  isCreator: boolean,
  customZone: readonly ZoneTile[] | null | undefined,
): string | null {
  if (!Array.isArray(positions) || positions.length !== shipCount) {
    return "Every ship needs a starting position.";
  }
  const seen = new Set<string>();
  for (const p of positions) {
    const row = Number((p as { row?: unknown })?.row);
    const col = Number((p as { col?: unknown })?.col);
    if (!isDeploymentTile(row, col, isCreator, customZone)) {
      return "Every ship must start inside your deployment zone.";
    }
    const key = `${row},${col}`;
    if (seen.has(key)) return "Two ships can't start on the same tile.";
    seen.add(key);
  }
  return null;
}

/** Default starting tiles when a fleet has none: the first free tiles of this side's zone. */
export function defaultStartingPositions(
  count: number,
  isCreator: boolean,
  customZone: readonly ZoneTile[] | null | undefined,
): ZoneTile[] {
  const tiles: ZoneTile[] = [];
  if (customZone && customZone.length > 0) {
    tiles.push(...customZone);
  } else {
    const band = isCreator ? DEFAULT_DEPLOYMENT_COLS.creator : DEFAULT_DEPLOYMENT_COLS.joiner;
    // Outermost column first, spread down the rows (matches the old
    // col 0 / col 16 every-other-row default before falling back inward).
    const cols = isCreator
      ? Array.from({ length: band.colMax - band.colMin + 1 }, (_, i) => band.colMin + i)
      : Array.from({ length: band.colMax - band.colMin + 1 }, (_, i) => band.colMax - i);
    for (const col of cols) {
      for (let row = 1; row < GRID_DIMENSIONS.HEIGHT; row += 2) tiles.push({ row, col });
      for (let row = 0; row < GRID_DIMENSIONS.HEIGHT; row += 2) tiles.push({ row, col });
    }
  }
  return tiles.slice(0, count);
}
