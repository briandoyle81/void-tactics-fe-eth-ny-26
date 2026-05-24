import type { Ship as DbShip } from "../generated/prisma";
import type { Ship, ShipEquipment, ShipTraits, ShipData } from "../types/types";
import type { Address } from "viem";

export function dbShipToShip(db: DbShip): Ship {
  const equipment = db.equipment as unknown as ShipEquipment;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const traitsRaw = db.traits as any;

  const traits: ShipTraits = {
    serialNumber: BigInt(traitsRaw.serialNumber ?? db.id),
    colors: traitsRaw.colors ?? { h1: 0, s1: 0, l1: 0, h2: 0, s2: 0, l2: 0 },
    variant: traitsRaw.variant ?? 0,
    accuracy: traitsRaw.accuracy ?? 0,
    hull: traitsRaw.hull ?? 0,
    speed: traitsRaw.speed ?? 0,
  };

  const shipData: ShipData = {
    shipsDestroyed: db.shipsDestroyed,
    costsVersion: 1,
    cost: db.cost,
    shiny: db.shiny,
    constructed: db.constructed,
    inFleet: db.inFleet,
    timestampDestroyed: db.destroyedAt ? BigInt(db.destroyedAt.getTime()) : 0n,
  };

  return {
    name: db.name,
    id: BigInt(db.id),
    equipment,
    traits,
    shipData,
    owner: db.ownerId as Address,
  };
}
