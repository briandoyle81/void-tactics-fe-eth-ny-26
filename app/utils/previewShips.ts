import type { Ship } from "../types/types";
import type { Web2Ship } from "../types/web2Ship";
import { PREVIEW_SHIP_ID_OFFSET, type ShipPreviewSpec } from "./shipPreviewSpec";

// Demo ships for ship-pack previews (Store tier cards, the Command Deck's
// featured pack), built from a ShipPreviewSpec in each mode's ship shape.

/** How often pack preview ships reroll — HeroShipShowcase's cadence. */
export const PREVIEW_REFRESH_INTERVAL_MS = 10000;

/** Web3 kills shown on a preview ship of the given rank. */
export function previewShipsDestroyedForRank(rank: number): number {
  switch (Math.min(5, rank)) {
    case 5:
      return 350;
    case 4:
      return 120;
    case 3:
      return 45;
    case 2:
      return 15;
    default:
      return 5;
  }
}

export function toPreviewShip(spec: ShipPreviewSpec): Ship {
  return {
    name: `Preview ${spec.seed}`,
    id: BigInt(PREVIEW_SHIP_ID_OFFSET + spec.seed),
    equipment: spec.equipment,
    traits: {
      serialNumber: BigInt(PREVIEW_SHIP_ID_OFFSET + spec.seed),
      colors: spec.colors,
      variant: spec.variant,
      accuracy: spec.accuracy,
      hull: spec.hull,
      speed: spec.speed,
    },
    shipData: {
      shipsDestroyed: spec.shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny: spec.shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0n,
    },
    owner: "0x0000000000000000000000000000000000000000",
  };
}

export function toPreviewShipWeb2(spec: ShipPreviewSpec): Web2Ship {
  return {
    name: `Preview ${spec.seed}`,
    id: PREVIEW_SHIP_ID_OFFSET + spec.seed,
    equipment: spec.equipment,
    traits: {
      serialNumber: PREVIEW_SHIP_ID_OFFSET + spec.seed,
      colors: spec.colors,
      variant: spec.variant,
      accuracy: spec.accuracy,
      hull: spec.hull,
      speed: spec.speed,
    },
    shipData: {
      shipsDestroyed: spec.shipsDestroyed,
      costsVersion: 0,
      cost: 0,
      shiny: spec.shiny,
      constructed: true,
      inFleet: false,
      timestampDestroyed: 0,
      modifiedCount: 0,
      isFree: false,
    },
    owner: "",
  };
}
