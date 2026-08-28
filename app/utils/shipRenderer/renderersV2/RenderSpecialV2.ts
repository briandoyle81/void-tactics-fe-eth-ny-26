/**
 * RenderSpecialV2 router
 * Ported from RenderSpecialV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderSpecial4V2 } from "./RenderSpecial4V2";
import { renderSpecial5V2 } from "./RenderSpecial5V2";
import { renderSpecial6V2 } from "./RenderSpecial6V2";

// Special enum values (from contract) — variant 2 uses Slot4/5/6, not the
// EMP/RepairDrones/FlakArray values variant 1 uses.
const Special = {
  None: 0,
  Slot4: 4,
  Slot5: 5,
  Slot6: 6,
} as const;

export function renderSpecialV2(ship: ShipVisual): string {
  if (ship.equipment.special === Special.None) {
    return "";
  } else if (ship.equipment.special === Special.Slot4) {
    return renderSpecial4V2(ship);
  } else if (ship.equipment.special === Special.Slot5) {
    return renderSpecial5V2(ship);
  } else if (ship.equipment.special === Special.Slot6) {
    return renderSpecial6V2(ship);
  }
  return "";
}
