import { Ship } from "../types/types";
import { toShipVisual } from "./toShipVisual";
import { getRankProgressInfo } from "./shipLevel";
import type { ShipCardData } from "../types/shipCardData";

export function toShipCardData(ship: Ship): ShipCardData {
  const rankInfo = getRankProgressInfo(toShipVisual(ship));
  return {
    id: ship.id.toString(),
    name: ship.name,
    isShiny: ship.shipData.shiny,
    isConstructed: ship.shipData.constructed,
    isDestroyed: ship.shipData.timestampDestroyed > 0n,
    timestampDestroyedSeconds: Number(ship.shipData.timestampDestroyed),
    inFleet: ship.shipData.inFleet,
    cost: Number(ship.shipData.cost),
    equipment: {
      mainWeapon: ship.equipment.mainWeapon,
      armor: ship.equipment.armor,
      shields: ship.equipment.shields,
      special: ship.equipment.special,
    },
    traits: {
      variant: ship.traits.variant,
      accuracy: ship.traits.accuracy,
      hull: ship.traits.hull,
      speed: ship.traits.speed,
    },
    rank: rankInfo.rank,
    rankShipsDestroyed: rankInfo.shipsDestroyed,
    rankNextRank: rankInfo.nextRank,
    rankKillsToNextRank: rankInfo.killsToNextRank,
  };
}
