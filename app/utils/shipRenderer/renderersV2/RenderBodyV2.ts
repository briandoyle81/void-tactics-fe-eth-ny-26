/**
 * RenderBodyV2 router
 * Ported from RenderBodyV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderBaseBodyV2 } from "./RenderBaseBodyV2";
import { renderShield1V2 } from "./RenderShield1V2";
import { renderShield2V2 } from "./RenderShield2V2";
import { renderShield3V2 } from "./RenderShield3V2";
import { renderArmor1V2 } from "./RenderArmor1V2";
import { renderArmor2V2 } from "./RenderArmor2V2";
import { renderArmor3V2 } from "./RenderArmor3V2";

// Equipment enum values
const Shields = {
  None: 0,
  Light: 1,
  Medium: 2,
  Advanced: 3, // Heavy in contract
} as const;

const Armor = {
  None: 0,
  Light: 1,
  Medium: 2,
  Heavy: 3,
} as const;

export function renderBodyV2(ship: ShipVisual): string {
  // If both shields and armor are None, return base body
  if (
    ship.equipment.shields === Shields.None &&
    ship.equipment.armor === Armor.None
  ) {
    return renderBaseBodyV2(ship);
  }

  // If shields are present, render shield (shields take priority)
  if (ship.equipment.shields !== Shields.None) {
    if (ship.equipment.shields === Shields.Light) {
      return renderShield1V2(ship);
    } else if (ship.equipment.shields === Shields.Medium) {
      return renderShield2V2(ship);
    } else if (ship.equipment.shields === Shields.Advanced) {
      return renderShield3V2(ship);
    }
  }

  // If armor is present, render armor
  if (ship.equipment.armor !== Armor.None) {
    if (ship.equipment.armor === Armor.Light) {
      return renderArmor1V2(ship);
    } else if (ship.equipment.armor === Armor.Medium) {
      return renderArmor2V2(ship);
    } else if (ship.equipment.armor === Armor.Heavy) {
      return renderArmor3V2(ship);
    }
  }

  return renderBaseBodyV2(ship);
}
