import { Ship } from "../types/types";
import { ShipVisual } from "../types/shipVisual";

/**
 * Adapts a web3 `Ship` (bigint `timestampDestroyed`) to the mode-agnostic
 * `ShipVisual` shape shared by the rendering/rank utilities. This is the
 * only place web3 code needs to touch `ShipVisual` — web2's `Web2Ship`
 * already satisfies it structurally with no adapter needed.
 */
export function toShipVisual(ship: Ship): ShipVisual {
  return {
    equipment: ship.equipment,
    traits: ship.traits,
    shipData: {
      shipsDestroyed: ship.shipData.shipsDestroyed,
      shiny: ship.shipData.shiny,
      constructed: ship.shipData.constructed,
      timestampDestroyed: Number(ship.shipData.timestampDestroyed),
    },
  };
}
