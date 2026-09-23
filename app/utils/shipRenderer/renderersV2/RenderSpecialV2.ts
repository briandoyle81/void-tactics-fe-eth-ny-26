/**
 * RenderSpecialV2 router
 * Ported from RenderSpecialV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderSpecial1V2 } from "./RenderSpecial1V2";
import { renderSpecial2V2 } from "./RenderSpecial2V2";
import { renderSpecial3V2 } from "./RenderSpecial3V2";

// Special enum values (from contract) — as of the 2026-09-20/21 attributes
// redesign, variant 2's three real specials moved from Slot4/5/6 to
// Slot1/2/3 (a generic Special.Slot1..Slot7 enum shared by every variant;
// meaning is per-(variant, slot), see types.ts's SPECIAL_NAMES_V2).
const Special = {
  None: 0,
  Slot1: 1,
  Slot2: 2,
  Slot3: 3,
} as const;

export function renderSpecialV2(ship: ShipVisual): string {
  if (ship.equipment.special === Special.None) {
    return "";
  } else if (ship.equipment.special === Special.Slot1) {
    return renderSpecial1V2(ship);
  } else if (ship.equipment.special === Special.Slot2) {
    return renderSpecial2V2(ship);
  } else if (ship.equipment.special === Special.Slot3) {
    return renderSpecial3V2(ship);
  }
  return "";
}
