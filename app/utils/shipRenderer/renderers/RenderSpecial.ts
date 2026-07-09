/**
 * RenderSpecial router
 * Ported from RenderSpecial.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderSpecial1 } from "./RenderSpecial1";
import { renderSpecial2 } from "./RenderSpecial2";
import { renderSpecial3 } from "./RenderSpecial3";

// Special enum values (from contract)
const Special = {
  None: 0,
  EMP: 1,
  RepairDrones: 2,
  FlakArray: 3,
} as const;

export function renderSpecial(ship: ShipVisual): string {
  if (ship.equipment.special === Special.None) {
    return "";
  } else if (ship.equipment.special === Special.EMP) {
    return renderSpecial1(ship);
  } else if (ship.equipment.special === Special.RepairDrones) {
    return renderSpecial2(ship);
  } else if (ship.equipment.special === Special.FlakArray) {
    return renderSpecial3(ship);
  }
  return "";
}
