import { prisma } from "./prisma";
import { calcShipCost, type CostsConfig } from "./shipCosts";

type ShipForRecalc = {
  id: number;
  costsVersion: number;
  equipment: unknown;
  traits: unknown;
};

// Recalculates costs for any ships whose costsVersion is behind the current config version.
// Writes updates to the DB and returns a map of id → new cost for in-memory patching.
export async function recalcStaleShips(
  ships: ShipForRecalc[],
  costs: CostsConfig,
): Promise<Map<number, number>> {
  const stale = ships.filter((s) => s.costsVersion < costs.version);
  if (stale.length === 0) return new Map();

  const recalculated = stale.map((ship) => ({
    id: ship.id,
    cost: calcShipCost(
      ship.equipment as { mainWeapon: number; armor: number; shields: number; special: number },
      ship.traits as { accuracy: number; hull: number; speed: number },
      costs,
    ),
  }));

  await prisma.$transaction(
    recalculated.map(({ id, cost }) =>
      prisma.ship.update({ where: { id }, data: { cost, costsVersion: costs.version } }),
    ),
  );

  return new Map(recalculated.map(({ id, cost }) => [id, cost]));
}
