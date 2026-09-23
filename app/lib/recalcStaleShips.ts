import { prisma } from "./prisma";
import { Prisma } from "../generated/prisma";
import { calcShipCost, type CostsConfig } from "./shipCosts";

type ShipForRecalc = {
  id: number;
  costsVersion: number;
  equipment: unknown;
  traits: unknown;
};

// Recalculates costs for any ships whose costsVersion is behind their OWN
// variant's current config version — costs are per-variant (as of the
// 2026-09-20/21 redesign), so a batch of ships spanning both variants must
// be checked and recalculated against the version that actually applies to
// each one, not a single shared version. Writes updates to the DB and
// returns a map of id → { new cost, new costsVersion } for in-memory
// patching — the version is per-ship (not a single shared value) for the
// same reason.
export async function recalcStaleShips(
  ships: ShipForRecalc[],
  costsByVariant: Record<number, CostsConfig>,
): Promise<Map<number, { cost: number; costsVersion: number }>> {
  const costsForShip = (traits: unknown): CostsConfig | undefined => {
    const variant = (traits as { variant?: number } | null)?.variant ?? 1;
    return costsByVariant[variant] ?? costsByVariant[1];
  };

  const stale = ships.filter((s) => {
    const costs = costsForShip(s.traits);
    return !!costs && s.costsVersion < costs.version;
  });
  if (stale.length === 0) return new Map();

  const recalculated = stale.map((ship) => {
    const costs = costsForShip(ship.traits)!;
    return {
      id: ship.id,
      cost: calcShipCost(
        ship.equipment as { mainWeapon: number; armor: number; shields: number; special: number },
        ship.traits as { accuracy: number; hull: number; speed: number },
        costs,
      ),
      costsVersion: costs.version,
    };
  });

  // A single batched UPDATE...FROM(VALUES...) instead of one UPDATE per
  // ship — this runs on every hit to hot, frequently-polled paths (the
  // ships list, lobby fleet submission), and after any admin cost-version
  // bump every affected user's ship count of round trips would otherwise
  // scale 1:1 with their stale ship count. costsVersion is now part of each
  // row's own VALUES tuple (rather than one shared value for the whole
  // batch) since it can differ by variant within the same batch.
  // Explicit ::int casts matter here — without them Postgres infers the
  // driver-bound parameters as `text`, and `s.id = v.id` then fails with
  // "operator does not exist: integer = text" (caught by a live smoke test).
  const values = Prisma.join(
    recalculated.map(
      ({ id, cost, costsVersion }) => Prisma.sql`(${id}::int, ${cost}::int, ${costsVersion}::int)`,
    ),
    ", ",
  );
  await prisma.$executeRaw`
    UPDATE "Ship" AS s
    SET cost = v.cost, "costsVersion" = v.costsversion
    FROM (VALUES ${values}) AS v(id, cost, costsversion)
    WHERE s.id = v.id
  `;

  return new Map(recalculated.map(({ id, cost, costsVersion }) => [id, { cost, costsVersion }]));
}
