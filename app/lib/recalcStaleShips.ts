import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma";
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

  // A single batched UPDATE...FROM(VALUES...) instead of one UPDATE per
  // ship — this runs on every hit to hot, frequently-polled paths (the
  // ships list, lobby fleet submission), and after any admin cost-version
  // bump every affected user's ship count of round trips would otherwise
  // scale 1:1 with their stale ship count.
  // Explicit ::int casts matter here — without them Postgres infers the
  // driver-bound parameters as `text`, and `s.id = v.id` then fails with
  // "operator does not exist: integer = text" (caught by a live smoke test).
  const values = Prisma.join(
    recalculated.map(({ id, cost }) => Prisma.sql`(${id}::int, ${cost}::int)`),
    ", ",
  );
  await prisma.$executeRaw`
    UPDATE "Ship" AS s
    SET cost = v.cost, "costsVersion" = ${costs.version}
    FROM (VALUES ${values}) AS v(id, cost)
    WHERE s.id = v.id
  `;

  return new Map(recalculated.map(({ id, cost }) => [id, cost]));
}
