/**
 * RenderAftV2 router
 * Ported from RenderAftV2.sol
 */

import { ShipVisual } from "../../../types/shipVisual";
import { renderAft0V2 } from "./RenderAft0V2";
import { renderAft1V2 } from "./RenderAft1V2";
import { renderAft2V2 } from "./RenderAft2V2";

export function renderAftV2(ship: ShipVisual): string {
  // Use the speed to determine which aft class to use
  if (ship.traits.speed === 0) {
    return renderAft0V2(ship);
  } else if (ship.traits.speed === 1) {
    return renderAft1V2(ship);
  } else {
    return renderAft2V2(ship);
  }
}
