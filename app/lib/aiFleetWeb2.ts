import { prisma } from "./prisma";
import { AI_USER_ID } from "./aiUser";
import { calcShipCost } from "./shipCosts";
import { getCurrentCosts } from "./getCurrentCosts";
import type { ShipEquipment, ShipTraits } from "../types/types";

export class NoAIPlacementsError extends Error {}

/**
 * Builds the AI's fleet for a lobby from the map's configured
 * AIMapPlacement rows — the web2 counterpart to SinglePlayerMatch's
 * setupAIFleet, sourcing from AIShipConfig/AIMapPlacement (the web2
 * counterpart to AIEncounters) instead of a difficulty-based random
 * generator. Fleet size/composition is whatever the map's admin
 * configured, same as web3 — not budget-aware (mirrors AIEncounters,
 * which isn't cost-limit-aware either).
 */
export async function generateAiFleetForMap(
  lobbyId: number,
  mapId: number,
): Promise<{ fleetId: number; shipIds: number[] }> {
  const placements = await prisma.aIMapPlacement.findMany({
    where: { mapId },
    include: { config: true },
  });
  if (placements.length === 0) {
    throw new NoAIPlacementsError(`No AI placements configured for map ${mapId}`);
  }

  const costs = await getCurrentCosts();
  const shipIds: number[] = [];
  const startingPositions: Array<{ row: number; col: number }> = [];
  let totalCost = 0;

  for (const placement of placements) {
    const config = placement.config;
    const equipment = config.equipment as unknown as ShipEquipment;
    const traits = config.traits as unknown as ShipTraits;
    const cost = calcShipCost(equipment, traits, costs);
    totalCost += cost;

    const ship = await prisma.ship.create({
      data: {
        ownerId: AI_USER_ID,
        name: config.name,
        equipment: equipment as object,
        traits: traits as object,
        cost,
        costsVersion: costs.version,
        constructed: true,
        inFleet: true,
      },
    });
    shipIds.push(ship.id);
    startingPositions.push({ row: placement.row, col: placement.col });

    await prisma.aIFleetShip.create({
      data: { shipId: ship.id, configId: config.id, archetype: config.archetype },
    });
  }

  const fleet = await prisma.fleet.create({
    data: {
      ownerId: AI_USER_ID,
      lobbyId,
      shipIds,
      totalCost,
      startingPositions,
      isComplete: true,
    },
  });

  return { fleetId: fleet.id, shipIds };
}
