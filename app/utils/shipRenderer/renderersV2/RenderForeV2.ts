/**
 * RenderForeV2 router
 * Ported from RenderForeV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderFore0V2 } from "./RenderFore0V2";
import { renderFore1V2 } from "./RenderFore1V2";
import { renderFore2V2 } from "./RenderFore2V2";
import { renderForePerfectV2 } from "./RenderForePerfectV2";

// Equipment enum values
const Armor = {
  None: 0,
  Light: 1,
  Medium: 2,
  Heavy: 3,
} as const;

const Shields = {
  None: 0,
  Light: 1,
  Medium: 2,
  Advanced: 3, // Heavy in contract
} as const;

export function renderForeV2(ship: ShipVisual): string {
  // If the ship is perfect, use the perfect renderer
  // Perfect: accuracy=2, hull=2, speed=2, and (armor=Heavy OR shields=Advanced)
  if (
    ship.traits.accuracy === 2 &&
    ship.traits.hull === 2 &&
    ship.traits.speed === 2 &&
    (ship.equipment.armor === Armor.Heavy ||
      ship.equipment.shields === Shields.Advanced)
  ) {
    return renderForePerfectV2(ship);
  }

  // Use the accuracy to determine which fore class to use
  if (ship.traits.accuracy === 0) {
    return renderFore0V2(ship);
  } else if (ship.traits.accuracy === 1) {
    return renderFore1V2(ship);
  } else {
    return renderFore2V2(ship);
  }
}
