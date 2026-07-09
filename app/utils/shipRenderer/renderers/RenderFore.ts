/**
 * RenderFore router
 * Ported from RenderFore.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderFore0 } from "./RenderFore0";
import { renderFore1 } from "./RenderFore1";
import { renderFore2 } from "./RenderFore2";
import { renderForePerfect } from "./RenderForePerfect";

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

export function renderFore(ship: ShipVisual): string {
  // If the ship is perfect, use the perfect renderer
  // Perfect: accuracy=2, hull=2, speed=2, and (armor=Heavy OR shields=Advanced)
  if (
    ship.traits.accuracy === 2 &&
    ship.traits.hull === 2 &&
    ship.traits.speed === 2 &&
    (ship.equipment.armor === Armor.Heavy ||
      ship.equipment.shields === Shields.Advanced)
  ) {
    return renderForePerfect(ship);
  }

  // Use the accuracy to determine which fore class to use
  if (ship.traits.accuracy === 0) {
    return renderFore0(ship);
  } else if (ship.traits.accuracy === 1) {
    return renderFore1(ship);
  } else {
    return renderFore2(ship);
  }
}
