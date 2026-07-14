import { prisma } from "./prisma";
import { createTtlCache } from "./ttlCache";

export interface MapTiles {
  blockedTiles: unknown;
  scoringTiles: unknown;
}

// One TTL cache per mapId — maps are static after creation except rare
// admin edits, but every game action (one per ship move) was re-fetching
// the same map row via a nested `include` on the game query.
const cachesByMapId = new Map<number, ReturnType<typeof createTtlCache<MapTiles | null>>>();

export async function getMapTiles(mapId: number): Promise<MapTiles | null> {
  let entry = cachesByMapId.get(mapId);
  if (!entry) {
    entry = createTtlCache(async () => {
      return prisma.map.findUnique({
        where: { id: mapId },
        select: { blockedTiles: true, scoringTiles: true },
      });
    }, 60_000);
    cachesByMapId.set(mapId, entry);
  }
  return entry.get();
}

export function invalidateMapTiles(mapId: number): void {
  cachesByMapId.get(mapId)?.invalidate();
}
