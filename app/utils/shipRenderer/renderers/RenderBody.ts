/**
 * RenderBody router
 * Ported from RenderBody.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderBaseBody } from "./RenderBaseBody";
import { renderShield1 } from "./RenderShield1";
import { renderShield2 } from "./RenderShield2";
import { renderShield3 } from "./RenderShield3";
import { renderArmor1 } from "./RenderArmor1";
import { renderArmor2 } from "./RenderArmor2";
import { renderArmor3 } from "./RenderArmor3";

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

export function renderBody(ship: ShipVisual): string {
  // If both shields and armor are None, return base body
  if (
    ship.equipment.shields === Shields.None &&
    ship.equipment.armor === Armor.None
  ) {
    return renderBaseBody(ship);
  }

  // If shields are present, render shield (shields take priority)
  if (ship.equipment.shields !== Shields.None) {
    if (ship.equipment.shields === Shields.Light) {
      return renderShield1(ship);
    } else if (ship.equipment.shields === Shields.Medium) {
      return renderShield2(ship);
    } else if (ship.equipment.shields === Shields.Advanced) {
      return renderShield3(ship);
    }
  }

  // If armor is present, render armor
  if (ship.equipment.armor !== Armor.None) {
    if (ship.equipment.armor === Armor.Light) {
      return renderArmor1(ship);
    } else if (ship.equipment.armor === Armor.Medium) {
      return renderArmor2(ship);
    } else if (ship.equipment.armor === Armor.Heavy) {
      return renderArmor3(ship);
    }
  }

  return renderBaseBody(ship);
}
