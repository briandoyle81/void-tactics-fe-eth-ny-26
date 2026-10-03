import { getMapTiles } from "./getMapTiles";
import {
  defaultStartingPositions,
  parseZoneTiles,
  startingPositionsError,
  type ZoneTile,
} from "../utils/deploymentZone";

/** A map's custom zone for one side (empty = default columns). Missing map or bad data -> no custom zone. */
export async function getMapZone(mapId: number | null | undefined, isCreator: boolean): Promise<ZoneTile[]> {
  if (mapId == null) return [];
  const tiles = await getMapTiles(mapId);
  if (!tiles) return [];
  return parseZoneTiles(isCreator ? tiles.creatorZone : tiles.joinerZone) ?? [];
}

/**
 * Server-side check of a submitted fleet's starting positions against the
 * map's deployment zone for that side — the web2 counterpart to web3's
 * Fleets.createFleet / Maps.isValidDeploymentTile. Returns an error message
 * or null.
 */
export async function startingPositionsErrorForMap(
  mapId: number | null | undefined,
  positions: unknown,
  shipCount: number,
  isCreator: boolean,
): Promise<string | null> {
  return startingPositionsError(positions, shipCount, isCreator, await getMapZone(mapId, isCreator));
}

/** Fallback starting tiles for a fleet stored without positions, inside the map's zone. */
export async function defaultStartingPositionsForMap(
  mapId: number | null | undefined,
  count: number,
  isCreator: boolean,
): Promise<ZoneTile[]> {
  return defaultStartingPositions(count, isCreator, await getMapZone(mapId, isCreator));
}
