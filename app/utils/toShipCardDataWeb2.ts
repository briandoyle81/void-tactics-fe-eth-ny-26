import { Web2Ship } from "../types/web2Ship";
import { getRankProgressInfo } from "./shipLevel";
import type { ShipCardData } from "../types/shipCardData";

// Web2Ship already satisfies ShipVisual structurally — no adapter needed
// before calling getRankProgressInfo (see toShipVisual.ts's doc comment).
export function toShipCardDataWeb2(ship: Web2Ship): ShipCardData {
  const rankInfo = getRankProgressInfo(ship);
  return {
    id: String(ship.id),
    name: ship.name,
    isShiny: ship.shipData.shiny,
    isConstructed: ship.shipData.constructed,
    isDestroyed: ship.shipData.timestampDestroyed > 0,
    timestampDestroyedSeconds: ship.shipData.timestampDestroyed,
    inFleet: ship.shipData.inFleet,
    cost: ship.shipData.cost,
    equipment: {
      mainWeapon: ship.equipment.mainWeapon,
      armor: ship.equipment.armor,
      shields: ship.equipment.shields,
      special: ship.equipment.special,
    },
    traits: {
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
